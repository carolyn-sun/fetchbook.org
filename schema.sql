DROP TABLE IF EXISTS devices;
CREATE TABLE devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  device_info TEXT NOT NULL, -- JSON string
  raw_device_info TEXT, -- Raw fastfetch JSON array
  
  -- Extracted searchable columns
  os TEXT GENERATED ALWAYS AS (json_extract(device_info, '$.OS')) STORED,
  cpu TEXT GENERATED ALWAYS AS (json_extract(device_info, '$.CPU')) STORED,
  gpu TEXT GENERATED ALWAYS AS (json_extract(device_info, '$.GPU')) STORED,
  memory TEXT GENERATED ALWAYS AS (json_extract(device_info, '$.Memory')) STORED,
  host_name TEXT GENERATED ALWAYS AS (json_extract(device_info, '$.Host')) STORED,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_public BOOLEAN DEFAULT 0,
  note TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_devices_username ON devices(username);
CREATE INDEX idx_devices_os ON devices(os);
CREATE INDEX idx_devices_cpu ON devices(cpu);
