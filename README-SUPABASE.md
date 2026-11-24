# CDL Inventory — Supabase backend

PHP and MySQL are gone. `api.php`, `install.php`, `.user.ini` and the `server/` folder are no longer needed.
The site in `public/` is now plain static files (HTML/CSS/JS) that talk straight to Supabase.

## Setup (about 10 minutes)

1. **Create a project** at supabase.com.
2. **Turn off email confirmation**: Authentication > Providers > Email > switch OFF "Confirm email".
   (Staff log in with a username; the app turns it into `username@cdl-inventory.com` behind the scenes. Nobody is ever emailed.)
3. **Create the database**: SQL Editor > New query > paste all of `supabase/schema.sql` > Run.
4. **Connect the site**: Project Settings > API. Copy the Project URL and the anon (or publishable) key into
   `public/assets/js/core/config.js`.
5. **Upload** the contents of `public/` to your hosting (Hostinger/cPanel static hosting is fine, no PHP needed).
   Do not upload the `supabase/` folder.
6. **Make your first Admin**: open the site, click "Create an account", register, then run this in the SQL Editor:
   `update public.profiles set role = 'Admin' where username = 'your-username';`
   Sign out and in again. Everyone who registers afterwards is Staff (view-only), same as before.

## Moving your old data
On the old site: Backup & Restore > Download Backup. On the new site (as Admin): Restore Backup with that file.
I could not see the old PHP server code, so restore accepts the same item/room/transfer/inspection/history fields the app displays.
Old user accounts and passwords cannot be moved (they were never in backups): re-register them.

## How it is protected
- Everything is locked with Row Level Security. Signed-in users can only read. All changes go through database functions that check the Admin role and write the activity log, so a Staff user cannot edit data even by calling the API directly.
- The QR classroom page works without login through one function that returns only name, description, property no., location, condition and count.
- The anon key in `config.js` is meant to be public. Never put the `service_role` key in the website.

## Behaviour choices I had to make (the old server code was not in the zip)
- Deleting a classroom that still has inventory is refused; move or delete the items first.
- Transfer of the full quantity moves the record. A partial quantity leaves the rest in the source room and creates a new record in the target room.
- Times are shown in Philippine time.
- Item photos are still stored inside the database as compressed JPEG text (as before).
- Registration is still open to anyone who finds the site. To stop that, switch off "Allow new users to sign up" in Supabase and create Staff from Authentication > Users.
