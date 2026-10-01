# tools

Local helper scripts. This folder is excluded from the site build, so nothing here is published.

## md2post.py — notes to posts

```bash
# preview first
python3 tools/md2post.py "/mnt/d/.../backups/2026/*.md" _posts --drop-date-tags --dry-run

# convert, with the model filling excerpt and feature_text
python3 tools/md2post.py "/mnt/d/.../backups/2026/*.md" _posts \
  --drop-date-tags --ai gemma4:12b --feature-first-image
```

The last argument is the target folder. Patterns in quotes are expanded by the script, so `**` works.
`--force` overwrites existing posts, `--move` deletes the note after a successful conversion.

### Images and videos

Point at files the normal way in your note and the script does the rest:

```markdown
![설명](shot.png)        <!-- next to the note -->
![[clip.mp4]]            <!-- Obsidian embed -->
<img src="shot.png">     <!-- plain HTML -->
```

On conversion each local file is copied to `assets/insertedImg/<post file name>/` and the link is
rewritten to the site path. Videos become a `<video controls>` block. Remote URLs are left alone.

- `--attachments DIR` — also look here (an Obsidian vault attachment folder, say).
- `--max-width 1600` — shrink wider images while copying. Needs Pillow (`pip install pillow`);
  without it the files are copied unchanged and the script says so.
- `--feature-first-image` — use the first image as the post banner and list thumbnail.
- Files over 1 MB get a warning. They live in git forever, so shrink them first when you can.

Long videos do not belong in the repository. Upload them to YouTube and embed with
`{% include video.html id="VIDEO_ID" %}`. Keep local `.mp4` files to short clips.

GitHub Pages limits worth knowing: 100 MB per file, 1 GB per site, 100 GB of traffic a month.

## sync-health-home.sh — refresh the Apps section

```bash
tools/sync-health-home.sh            # from the default source folder
tools/sync-health-home.sh /other/path
```

Copies the static files only: no `node_modules`, no `Origin/` (it holds a private key), and no font
folder, since the tools use the site's own D2Coding copy.
