package com.mtbservice;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import org.json.JSONArray;
import org.json.JSONObject;

public class DatabaseHelper extends SQLiteOpenHelper {

    private static final String DB_NAME = "mtb-service.db";
    private static final int DB_VERSION = 2;

    public DatabaseHelper(Context context) {
        super(context, DB_NAME, null, DB_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL(
            "CREATE TABLE bikes (" +
            "id TEXT PRIMARY KEY, " +
            "brand TEXT NOT NULL DEFAULT '', " +
            "model TEXT NOT NULL DEFAULT '', " +
            "year TEXT DEFAULT '', " +
            "frameSize TEXT DEFAULT '', " +
            "color TEXT DEFAULT '', " +
            "serial TEXT DEFAULT '', " +
            "notes TEXT DEFAULT '', " +
            "createdAt TEXT DEFAULT ''" +
            ")"
        );
        db.execSQL(
            "CREATE TABLE components (" +
            "id TEXT PRIMARY KEY, " +
            "bikeId TEXT NOT NULL, " +
            "name TEXT NOT NULL, " +
            "brand TEXT DEFAULT '', " +
            "installedDate TEXT DEFAULT '', " +
            "installedKm INTEGER DEFAULT 0, " +
            "notes TEXT DEFAULT '', " +
            "FOREIGN KEY (bikeId) REFERENCES bikes(id) ON DELETE CASCADE" +
            ")"
        );
        db.execSQL(
            "CREATE TABLE service_log (" +
            "id TEXT PRIMARY KEY, " +
            "bikeId TEXT NOT NULL, " +
            "date TEXT NOT NULL, " +
            "odometer INTEGER DEFAULT 0, " +
            "type TEXT NOT NULL, " +
            "description TEXT DEFAULT '', " +
            "parts TEXT DEFAULT '', " +
            "cost REAL DEFAULT 0, " +
            "FOREIGN KEY (bikeId) REFERENCES bikes(id) ON DELETE CASCADE" +
            ")"
        );
        db.execSQL(
            "CREATE TABLE reminders (" +
            "id TEXT PRIMARY KEY, " +
            "title TEXT NOT NULL, " +
            "category TEXT DEFAULT 'other', " +
            "intervalKm INTEGER DEFAULT 0, " +
            "intervalDays INTEGER DEFAULT 0, " +
            "lastDate TEXT DEFAULT '', " +
            "lastKm INTEGER DEFAULT 0" +
            ")"
        );
        seedReminders(db);
    }

    @Override
    public void onConfigure(SQLiteDatabase db) {
        super.onConfigure(db);
        db.execSQL("PRAGMA foreign_keys = ON");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS components");
        db.execSQL("DROP TABLE IF EXISTS service_log");
        db.execSQL("DROP TABLE IF EXISTS bikes");
        db.execSQL("DROP TABLE IF EXISTS reminders");
        onCreate(db);
    }

    @Override
    public void onDowngrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        onUpgrade(db, oldVersion, newVersion);
    }

    private void seedReminders(SQLiteDatabase db) {
        Cursor c = db.rawQuery("SELECT COUNT(*) FROM reminders", null);
        c.moveToFirst();
        if (c.getInt(0) > 0) { c.close(); return; }
        c.close();

        String[][] defaults = {
            {"rem-chain", "Смазка цепи", "drivetrain", "150", "14"},
            {"rem-shift", "Регулировка переключателей", "drivetrain", "500", "60"},
            {"rem-brake-pads", "Замена тормозных колодок", "brakes", "800", "120"},
            {"rem-brake-fluid", "Замена тормозной жидкости", "brakes", "0", "365"},
            {"rem-fork-service", "Обслуживание вилки (мелкое)", "suspension", "500", "90"},
            {"rem-fork-overhaul", "Полное обслуживание вилки", "suspension", "0", "365"},
            {"rem-chain-replace", "Замена цепи", "drivetrain", "1000", "0"},
            {"rem-cassette", "Замена кассеты", "drivetrain", "3000", "0"},
            {"rem-pivot", "Смазка и затяжка шарниров подвески", "suspension", "0", "180"},
            {"rem-headset", "Обслуживание рулевой колонки", "frame", "0", "180"},
            {"rem-wheel-true", "Правка колёс", "wheels", "0", "90"},
            {"rem-bearing", "Замена колёсных подшипников", "wheels", "0", "365"},
        };
        for (String[] row : defaults) {
            db.execSQL("INSERT INTO reminders (id,title,category,intervalKm,intervalDays,lastDate,lastKm) VALUES (?,?,?,?,?,?,?)",
                new Object[]{row[0], row[1], row[2], Integer.parseInt(row[3]), Integer.parseInt(row[4]), "", 0});
        }
    }

    // --- Helpers ---

    private int getInt(Cursor c, String col) {
        int idx = c.getColumnIndex(col);
        return idx >= 0 ? c.getInt(idx) : 0;
    }

    private String getString(Cursor c, String col) {
        int idx = c.getColumnIndex(col);
        return idx >= 0 ? c.getString(idx) : "";
    }

    private double getDouble(Cursor c, String col) {
        int idx = c.getColumnIndex(col);
        return idx >= 0 ? c.getDouble(idx) : 0;
    }

    // --- Bikes ---

    public JSONArray getBikes() throws Exception {
        JSONArray arr = new JSONArray();
        Cursor c = getReadableDatabase().rawQuery("SELECT * FROM bikes ORDER BY id DESC", null);
        while (c.moveToNext()) arr.put(bikeFromCursor(c));
        c.close();
        return arr;
    }

    public JSONObject getBike(String id) throws Exception {
        Cursor c = getReadableDatabase().rawQuery("SELECT * FROM bikes WHERE id=?", new String[]{id});
        JSONObject obj = null;
        if (c.moveToFirst()) obj = bikeFromCursor(c);
        c.close();
        return obj;
    }

    public JSONObject createBike(String json) throws Exception {
        JSONObject o = new JSONObject(json);
        getWritableDatabase().execSQL(
            "INSERT INTO bikes (id,brand,model,year,frameSize,color,serial,notes,createdAt) VALUES (?,?,?,?,?,?,?,?,?)",
            new Object[]{
                o.optString("id",""), o.optString("brand",""), o.optString("model",""),
                o.optString("year",""), o.optString("frameSize",""),
                o.optString("color",""), o.optString("serial",""),
                o.optString("notes",""), o.optString("createdAt","")
            });
        return getBike(o.optString("id",""));
    }

    public void updateBike(String id, String json) throws Exception {
        JSONObject o = new JSONObject(json);
        getWritableDatabase().execSQL(
            "UPDATE bikes SET brand=?,model=?,year=?,frameSize=?,color=?,serial=?,notes=? WHERE id=?",
            new Object[]{
                o.optString("brand",""), o.optString("model",""),
                o.optString("year",""), o.optString("frameSize",""),
                o.optString("color",""), o.optString("serial",""),
                o.optString("notes",""), id
            });
    }

    public void deleteBike(String id) throws Exception {
        getWritableDatabase().execSQL("DELETE FROM components WHERE bikeId=?", new Object[]{id});
        getWritableDatabase().execSQL("DELETE FROM service_log WHERE bikeId=?", new Object[]{id});
        getWritableDatabase().execSQL("DELETE FROM bikes WHERE id=?", new Object[]{id});
    }

    private JSONObject bikeFromCursor(Cursor c) throws Exception {
        JSONObject o = new JSONObject();
        o.put("id", getString(c, "id"));
        o.put("brand", getString(c, "brand"));
        o.put("model", getString(c, "model"));
        o.put("year", getString(c, "year"));
        o.put("frameSize", getString(c, "frameSize"));
        o.put("color", getString(c, "color"));
        o.put("serial", getString(c, "serial"));
        o.put("notes", getString(c, "notes"));
        o.put("createdAt", getString(c, "createdAt"));
        return o;
    }

    // --- Components ---

    public JSONArray getComponents(String bikeId) throws Exception {
        JSONArray arr = new JSONArray();
        Cursor c = getReadableDatabase().rawQuery("SELECT * FROM components WHERE bikeId=? ORDER BY id DESC", new String[]{bikeId});
        while (c.moveToNext()) arr.put(componentFromCursor(c));
        c.close();
        return arr;
    }

    public JSONObject getComponent(String id) throws Exception {
        Cursor c = getReadableDatabase().rawQuery("SELECT * FROM components WHERE id=?", new String[]{id});
        JSONObject obj = null;
        if (c.moveToFirst()) obj = componentFromCursor(c);
        c.close();
        return obj;
    }

    public JSONObject createComponent(String json) throws Exception {
        JSONObject o = new JSONObject(json);
        getWritableDatabase().execSQL(
            "INSERT INTO components (id,bikeId,name,brand,installedDate,installedKm,notes) VALUES (?,?,?,?,?,?,?)",
            new Object[]{
                o.optString("id",""), o.optString("bikeId",""),
                o.optString("name",""), o.optString("brand",""),
                o.optString("installedDate",""), o.optInt("installedKm",0),
                o.optString("notes","")
            });
        return getComponent(o.optString("id",""));
    }

    public void updateComponent(String id, String json) throws Exception {
        JSONObject o = new JSONObject(json);
        getWritableDatabase().execSQL(
            "UPDATE components SET name=?,brand=?,installedDate=?,installedKm=?,notes=? WHERE id=?",
            new Object[]{
                o.optString("name",""), o.optString("brand",""),
                o.optString("installedDate",""), o.optInt("installedKm",0),
                o.optString("notes",""), id
            });
    }

    public void deleteComponent(String id) throws Exception {
        getWritableDatabase().execSQL("DELETE FROM components WHERE id=?", new Object[]{id});
    }

    private JSONObject componentFromCursor(Cursor c) throws Exception {
        JSONObject o = new JSONObject();
        o.put("id", getString(c, "id"));
        o.put("bikeId", getString(c, "bikeId"));
        o.put("name", getString(c, "name"));
        o.put("brand", getString(c, "brand"));
        o.put("installedDate", getString(c, "installedDate"));
        o.put("installedKm", getInt(c, "installedKm"));
        o.put("notes", getString(c, "notes"));
        return o;
    }

    // --- Services ---

    public JSONArray getServices(String bikeIdFilter) throws Exception {
        JSONArray arr = new JSONArray();
        String sql = bikeIdFilter != null && !bikeIdFilter.isEmpty() && !bikeIdFilter.equals("0")
            ? "SELECT * FROM service_log WHERE bikeId=? ORDER BY date DESC"
            : "SELECT * FROM service_log ORDER BY date DESC";
        Cursor c = bikeIdFilter != null && !bikeIdFilter.isEmpty() && !bikeIdFilter.equals("0")
            ? getReadableDatabase().rawQuery(sql, new String[]{bikeIdFilter})
            : getReadableDatabase().rawQuery(sql, null);
        while (c.moveToNext()) arr.put(serviceFromCursor(c));
        c.close();
        return arr;
    }

    public JSONObject getService(String id) throws Exception {
        Cursor c = getReadableDatabase().rawQuery("SELECT * FROM service_log WHERE id=?", new String[]{id});
        JSONObject obj = null;
        if (c.moveToFirst()) obj = serviceFromCursor(c);
        c.close();
        return obj;
    }

    public JSONObject createService(String json) throws Exception {
        JSONObject o = new JSONObject(json);
        getWritableDatabase().execSQL(
            "INSERT INTO service_log (id,bikeId,date,odometer,type,description,parts,cost) VALUES (?,?,?,?,?,?,?,?)",
            new Object[]{
                o.optString("id",""), o.optString("bikeId",""),
                o.optString("date",""), o.optInt("odometer",0),
                o.optString("type",""), o.optString("description",""),
                o.optString("parts",""), o.optDouble("cost",0)
            });
        return getService(o.optString("id",""));
    }

    public void updateService(String id, String json) throws Exception {
        JSONObject o = new JSONObject(json);
        getWritableDatabase().execSQL(
            "UPDATE service_log SET bikeId=?,date=?,odometer=?,type=?,description=?,parts=?,cost=? WHERE id=?",
            new Object[]{
                o.optString("bikeId",""), o.optString("date",""),
                o.optInt("odometer",0), o.optString("type",""),
                o.optString("description",""), o.optString("parts",""),
                o.optDouble("cost",0), id
            });
    }

    public void deleteService(String id) throws Exception {
        getWritableDatabase().execSQL("DELETE FROM service_log WHERE id=?", new Object[]{id});
    }

    private JSONObject serviceFromCursor(Cursor c) throws Exception {
        JSONObject o = new JSONObject();
        o.put("id", getString(c, "id"));
        o.put("bikeId", getString(c, "bikeId"));
        o.put("date", getString(c, "date"));
        o.put("odometer", getInt(c, "odometer"));
        o.put("type", getString(c, "type"));
        o.put("description", getString(c, "description"));
        o.put("parts", getString(c, "parts"));
        o.put("cost", getDouble(c, "cost"));
        return o;
    }

    // --- Reminders ---

    public JSONArray getReminders() throws Exception {
        JSONArray arr = new JSONArray();
        Cursor c = getReadableDatabase().rawQuery("SELECT * FROM reminders ORDER BY id ASC", null);
        while (c.moveToNext()) arr.put(reminderFromCursor(c));
        c.close();
        return arr;
    }

    public JSONObject getReminder(String id) throws Exception {
        Cursor c = getReadableDatabase().rawQuery("SELECT * FROM reminders WHERE id=?", new String[]{id});
        JSONObject obj = null;
        if (c.moveToFirst()) obj = reminderFromCursor(c);
        c.close();
        return obj;
    }

    public JSONObject createReminder(String json) throws Exception {
        JSONObject o = new JSONObject(json);
        getWritableDatabase().execSQL(
            "INSERT INTO reminders (id,title,category,intervalKm,intervalDays,lastDate,lastKm) VALUES (?,?,?,?,?,?,?)",
            new Object[]{
                o.optString("id",""), o.optString("title",""),
                o.optString("category","other"), o.optInt("intervalKm",0),
                o.optInt("intervalDays",0), o.optString("lastDate",""),
                o.optInt("lastKm",0)
            });
        return getReminder(o.optString("id",""));
    }

    public void updateReminder(String id, String json) throws Exception {
        JSONObject o = new JSONObject(json);
        getWritableDatabase().execSQL(
            "UPDATE reminders SET lastDate=?,lastKm=? WHERE id=?",
            new Object[]{o.optString("lastDate",""), o.optInt("lastKm",0), id});
    }

    public void updateReminderField(String id, String field, String value) throws Exception {
        getWritableDatabase().execSQL("UPDATE reminders SET " + field + "=? WHERE id=?", new Object[]{value, id});
    }

    public void deleteReminder(String id) throws Exception {
        getWritableDatabase().execSQL("DELETE FROM reminders WHERE id=?", new Object[]{id});
    }

    private JSONObject reminderFromCursor(Cursor c) throws Exception {
        JSONObject o = new JSONObject();
        o.put("id", getString(c, "id"));
        o.put("title", getString(c, "title"));
        o.put("category", getString(c, "category"));
        o.put("intervalKm", getInt(c, "intervalKm"));
        o.put("intervalDays", getInt(c, "intervalDays"));
        o.put("lastDate", getString(c, "lastDate"));
        o.put("lastKm", getInt(c, "lastKm"));
        return o;
    }

    // --- Stats ---

    public JSONObject getStats() throws Exception {
        JSONObject s = new JSONObject();
        Cursor c;
        c = getReadableDatabase().rawQuery("SELECT COUNT(*) FROM bikes", null); c.moveToFirst();
        s.put("bikeCount", c.getInt(0)); c.close();
        c = getReadableDatabase().rawQuery("SELECT COUNT(*) FROM service_log", null); c.moveToFirst();
        s.put("serviceCount", c.getInt(0)); c.close();
        c = getReadableDatabase().rawQuery("SELECT COALESCE(SUM(cost),0) FROM service_log", null); c.moveToFirst();
        s.put("totalCost", c.getDouble(0)); c.close();
        return s;
    }

    // --- Export / Import ---

    public String exportJson() throws Exception {
        JSONObject dump = new JSONObject();
        dump.put("bikes", getBikes());
        Cursor cur = getReadableDatabase().rawQuery("SELECT * FROM components ORDER BY id", null);
        JSONArray allComps = new JSONArray();
        while (cur.moveToNext()) allComps.put(componentFromCursor(cur));
        cur.close();
        dump.put("components", allComps);
        Cursor c = getReadableDatabase().rawQuery("SELECT * FROM service_log ORDER BY id", null);
        JSONArray svc = new JSONArray();
        while (c.moveToNext()) svc.put(serviceFromCursor(c));
        c.close();
        dump.put("services", svc);
        c = getReadableDatabase().rawQuery("SELECT * FROM reminders ORDER BY id", null);
        JSONArray rem = new JSONArray();
        while (c.moveToNext()) rem.put(reminderFromCursor(c));
        c.close();
        dump.put("reminders", rem);
        return dump.toString(2);
    }

    public void importJson(String json) throws Exception {
        JSONObject dump = new JSONObject(json);
        JSONArray bikes = dump.optJSONArray("bikes");
        JSONArray components = dump.optJSONArray("components");
        JSONArray services = dump.optJSONArray("services");
        JSONArray reminders = dump.optJSONArray("reminders");
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            db.execSQL("DELETE FROM components");
            db.execSQL("DELETE FROM service_log");
            db.execSQL("DELETE FROM reminders");
            db.execSQL("DELETE FROM bikes");

            if (bikes != null) {
                for (int i = 0; i < bikes.length(); i++) {
                    JSONObject b = bikes.getJSONObject(i);
                    db.execSQL("INSERT INTO bikes (id,brand,model,year,frameSize,color,serial,notes,createdAt) VALUES (?,?,?,?,?,?,?,?,?)",
                        new Object[]{
                            b.optString("id",""), b.optString("brand",""), b.optString("model",""),
                            b.optString("year",""), b.optString("frameSize",""),
                            b.optString("color",""), b.optString("serial",""),
                            b.optString("notes",""), b.optString("createdAt","")
                        });
                }
            }
            if (components != null) {
                for (int i = 0; i < components.length(); i++) {
                    JSONObject c = components.getJSONObject(i);
                    db.execSQL("INSERT INTO components (id,bikeId,name,brand,installedDate,installedKm,notes) VALUES (?,?,?,?,?,?,?)",
                        new Object[]{
                            c.optString("id",""), c.optString("bikeId",""),
                            c.optString("name",""), c.optString("brand",""),
                            c.optString("installedDate",""), c.optInt("installedKm",0),
                            c.optString("notes","")
                        });
                }
            }
            if (services != null) {
                for (int i = 0; i < services.length(); i++) {
                    JSONObject s = services.getJSONObject(i);
                    db.execSQL("INSERT INTO service_log (id,bikeId,date,odometer,type,description,parts,cost) VALUES (?,?,?,?,?,?,?,?)",
                        new Object[]{
                            s.optString("id",""), s.optString("bikeId",""),
                            s.optString("date",""), s.optInt("odometer",0),
                            s.optString("type",""), s.optString("description",""),
                            s.optString("parts",""), s.optDouble("cost",0)
                        });
                }
            }
            if (reminders != null) {
                for (int i = 0; i < reminders.length(); i++) {
                    JSONObject r = reminders.getJSONObject(i);
                    db.execSQL("INSERT INTO reminders (id,title,category,intervalKm,intervalDays,lastDate,lastKm) VALUES (?,?,?,?,?,?,?)",
                        new Object[]{
                            r.optString("id",""), r.optString("title",""),
                            r.optString("category","other"), r.optInt("intervalKm",0),
                            r.optInt("intervalDays",0), r.optString("lastDate",""),
                            r.optInt("lastKm",0)
                        });
                }
            }
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }
}
