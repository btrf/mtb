package com.mtbservice;

import android.webkit.JavascriptInterface;

public class JsBridge {

    private final DatabaseHelper db;
    private final MainActivity activity;

    public JsBridge(DatabaseHelper db, MainActivity activity) {
        this.db = db;
        this.activity = activity;
    }

    @JavascriptInterface
    public String bikesGetAll() {
        try { return db.getBikes().toString(); } catch (Exception e) { return "[]"; }
    }

    @JavascriptInterface
    public String bikesGetById(String id) {
        try { return db.getBike(id) != null ? db.getBike(id).toString() : "null"; } catch (Exception e) { return "null"; }
    }

    @JavascriptInterface
    public String bikesCreate(String json) {
        try { return db.createBike(json).toString(); } catch (Exception e) { return "{\"error\":\"" + e.getMessage() + "\"}"; }
    }

    @JavascriptInterface
    public void bikesUpdate(String id, String json) {
        try { db.updateBike(id, json); } catch (Exception ignored) {}
    }

    @JavascriptInterface
    public void bikesDelete(String id) {
        try { db.deleteBike(id); } catch (Exception ignored) {}
    }

    @JavascriptInterface
    public String componentsGetAll(String bikeId) {
        try { return db.getComponents(bikeId).toString(); } catch (Exception e) { return "[]"; }
    }

    @JavascriptInterface
    public String componentsGetById(String id) {
        try { return db.getComponent(id) != null ? db.getComponent(id).toString() : "null"; } catch (Exception e) { return "null"; }
    }

    @JavascriptInterface
    public String componentsCreate(String json) {
        try { return db.createComponent(json).toString(); } catch (Exception e) { return "{\"error\":\"" + e.getMessage() + "\"}"; }
    }

    @JavascriptInterface
    public void componentsUpdate(String id, String json) {
        try { db.updateComponent(id, json); } catch (Exception ignored) {}
    }

    @JavascriptInterface
    public void componentsDelete(String id) {
        try { db.deleteComponent(id); } catch (Exception ignored) {}
    }

    @JavascriptInterface
    public String servicesGetAll(String bikeId) {
        try { return db.getServices(bikeId).toString(); } catch (Exception e) { return "[]"; }
    }

    @JavascriptInterface
    public String servicesCreate(String json) {
        try { return db.createService(json).toString(); } catch (Exception e) { return "{\"error\":\"" + e.getMessage() + "\"}"; }
    }

    @JavascriptInterface
    public void servicesDelete(String id) {
        try { db.deleteService(id); } catch (Exception ignored) {}
    }

    @JavascriptInterface
    public String remindersGetAll() {
        try { return db.getReminders().toString(); } catch (Exception e) { return "[]"; }
    }

    @JavascriptInterface
    public String remindersCreate(String json) {
        try { return db.createReminder(json).toString(); } catch (Exception e) { return "{\"error\":\"" + e.getMessage() + "\"}"; }
    }

    @JavascriptInterface
    public void remindersUpdate(String id, String json) {
        try { db.updateReminder(id, json); } catch (Exception ignored) {}
    }

    @JavascriptInterface
    public void remindersDelete(String id) {
        try { db.deleteReminder(id); } catch (Exception ignored) {}
    }

    @JavascriptInterface
    public String getStats() {
        try { return db.getStats().toString(); } catch (Exception e) { return "{}"; }
    }

    @JavascriptInterface
    public void exportJson() {
        try {
            byte[] bytes = db.exportJson().getBytes("UTF-8");
            activity.runOnUiThread(() ->
                activity.startSaveFilePicker("mtb-service.json", "application/json", bytes));
        } catch (Exception e) {
            activity.runOnUiThread(() -> {
                String msg = activity.getString(R.string.export_error, e.getMessage());
                android.widget.Toast.makeText(activity, msg, android.widget.Toast.LENGTH_LONG).show();
            });
        }
    }

    @JavascriptInterface
    public void importJson(String json) {
        try {
            db.importJson(json);
            activity.runOnUiThread(() ->
                android.widget.Toast.makeText(activity, R.string.import_success, android.widget.Toast.LENGTH_SHORT).show());
        } catch (Exception e) {
            activity.runOnUiThread(() -> {
                String msg = activity.getString(R.string.import_error, e.getMessage());
                android.widget.Toast.makeText(activity, msg, android.widget.Toast.LENGTH_LONG).show();
            });
        }
    }

}
