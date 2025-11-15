# Manual Column Rename Instructions

If the automated script doesn't work, run this SQL command directly in your MySQL client:

## Option 1: Using MySQL Command Line
```bash
mysql -u root -p mirart
```

Then run:
```sql
ALTER TABLE listings CHANGE image_url primary_image_url VARCHAR(500);
```

## Option 2: Using phpMyAdmin or MySQL Workbench
1. Connect to your database
2. Select the `mirart` database
3. Go to the SQL tab
4. Run this command:
```sql
ALTER TABLE listings CHANGE image_url primary_image_url VARCHAR(500);
```

## Option 3: Using the SQL file
Run:
```bash
mysql -u root -p mirart < backend/database/rename-column-simple.sql
```

## Verify the change
After running, verify with:
```sql
SHOW COLUMNS FROM listings LIKE '%image%';
```

You should see:
- `primary_image_url` (not `image_url`)
- `image_urls`

