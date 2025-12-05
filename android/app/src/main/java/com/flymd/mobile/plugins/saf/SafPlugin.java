package com.flymd.mobile.plugins.saf;

import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "Saf")
public class SafPlugin extends Plugin {
    private PluginCall pendingPickCall;
    private PluginCall pendingCreateCall;

    private final ActivityResultLauncher<Intent> pickLauncher =
            registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), this::handlePickResult);

    private final ActivityResultLauncher<Intent> createLauncher =
            registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), this::handleCreateResult);

    @PluginMethod
    public void pickDocument(PluginCall call) {
        pendingPickCall = call;
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false);
        intent.addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        pickLauncher.launch(intent);
    }

    @PluginMethod
    public void createDocument(PluginCall call) {
        pendingCreateCall = call;
        String filename = call.getString("filename", "untitled.md");
        String mimeType = call.getString("mimeType", "text/markdown");
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        intent.addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        createLauncher.launch(intent);
    }

    @PluginMethod
    public void readUri(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null || uriStr.isEmpty()) {
            call.reject("uri is required");
            return;
        }
        Uri uri = Uri.parse(uriStr);
        try (InputStream inputStream = getContext().getContentResolver().openInputStream(uri)) {
            if (inputStream == null) {
                call.reject("Unable to open URI: " + uriStr);
                return;
            }
            StringBuilder content = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    content.append(line).append('\n');
                }
            }
            JSONObject result = new JSONObject();
            result.put("content", content.toString());
            call.resolve(result);
        } catch (Exception e) {
            call.reject("readUri failed: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void writeUri(PluginCall call) {
        String uriStr = call.getString("uri");
        String content = call.getString("content", "");
        if (uriStr == null || uriStr.isEmpty()) {
            call.reject("uri is required");
            return;
        }
        Uri uri = Uri.parse(uriStr);
        ContentResolver resolver = getContext().getContentResolver();
        try (OutputStream outputStream = resolver.openOutputStream(uri, "wt")) {
            if (outputStream == null) {
                call.reject("Unable to open URI for writing: " + uriStr);
                return;
            }
            outputStream.write(content.getBytes(StandardCharsets.UTF_8));
            outputStream.flush();
            call.resolve();
        } catch (Exception e) {
            call.reject("writeUri failed: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void persistPermission(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null || uriStr.isEmpty()) {
            call.resolve();
            return;
        }
        Uri uri = Uri.parse(uriStr);
        try {
            final int flags = Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
            getContext().getContentResolver().takePersistableUriPermission(uri, flags);
        } catch (Exception ignored) {
        }
        call.resolve();
    }

    private void handlePickResult(ActivityResult result) {
        if (pendingPickCall == null) return;
        PluginCall call = pendingPickCall;
        pendingPickCall = null;

        if (result.getResultCode() != getActivity().RESULT_OK || result.getData() == null) {
            call.reject("USER_CANCELED");
            return;
        }

        Uri uri = result.getData().getData();
        if (uri == null) {
            call.reject("No URI returned");
            return;
        }

        persistIfPossible(uri, result.getData());
        resolveUri(call, uri);
    }

    private void handleCreateResult(ActivityResult result) {
        if (pendingCreateCall == null) return;
        PluginCall call = pendingCreateCall;
        pendingCreateCall = null;

        if (result.getResultCode() != getActivity().RESULT_OK || result.getData() == null) {
            call.reject("USER_CANCELED");
            return;
        }

        Uri uri = result.getData().getData();
        if (uri == null) {
            call.reject("No URI returned");
            return;
        }

        persistIfPossible(uri, result.getData());
        resolveUri(call, uri);
    }

    private void resolveUri(PluginCall call, Uri uri) {
        try {
            String name = queryDisplayName(uri);
            JSONObject result = new JSONObject();
            result.put("uri", uri.toString());
            result.put("name", name);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to resolve URI: " + e.getMessage(), e);
        }
    }

    private void persistIfPossible(Uri uri, Intent data) {
        try {
            final int flags = (data.getFlags()
                    & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION));
            getContext().getContentResolver().takePersistableUriPermission(uri, flags);
        } catch (Exception ignored) {
        }
    }

    private String queryDisplayName(Uri uri) {
        ContentResolver resolver = getContext().getContentResolver();
        try (Cursor cursor = resolver.query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (nameIndex >= 0) {
                    return cursor.getString(nameIndex);
                }
            }
        } catch (Exception ignored) {
        }
        try {
            return DocumentsContract.getDocumentId(uri);
        } catch (Exception e) {
            String last = uri.getLastPathSegment();
            return last != null ? last : "document";
        }
    }
}
