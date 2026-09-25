# ⚡ Quick Start Guide

Get the Notes App frontend running in 3 steps!

## Prerequisites

- Node.js 18+ installed
- Backend running at `http://localhost:8080`

## Step 1: Install Dependencies

```bash
cd /home/titan/project/todo-app/frontend
npm install
```

This will install ~20 dependencies (takes 1-2 minutes).

## Step 2: Start Development Server

```bash
npm run dev
```

You should see:
```
  VITE v5.4.8  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

## Step 3: Open in Browser

Open [http://localhost:3000](http://localhost:3000)

You should see the **Dashboard** with:
- Sidebar navigation on the left
- Search bar in header
- Statistics cards
- Charts for data visualization

## 🎯 Quick Tour

### Main Features to Try

1. **Create a Note**
   - Click "New Note" button (top right)
   - Fill in name and content with rich text editor
   - Add tags, bucket, team members
   - Click "Create Note"

2. **View Notes**
   - Click "Notes" in sidebar
   - Switch between Grid and List views
   - Try the filters
   - Search for notes

3. **Explore Views**
   - **Bucket View**: Kanban-style board
   - **Priority View**: Sorted by priority
   - **Hot Topics**: Important items

4. **Manage Resources**
   - **Tags**: Create colored tags
   - **Buckets**: Create buckets with priorities
   - **Team Members**: Add team members

5. **Try Dark Mode**
   - Click moon/sun icon in header
   - Theme persists across sessions

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in vite.config.ts
```

### Cannot Connect to Backend
```bash
# Make sure backend is running
curl http://localhost:8080/api/notes

# Check proxy config in vite.config.ts
```

### Dependencies Failed
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build Errors
```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Restart dev server
npm run dev
```

## 📊 What's Included

### Pages (13)
- Dashboard
- Notes List
- Note Detail/Create/Edit
- Bucket View (Kanban)
- Priority View
- Hot Topics
- Tags/Buckets/Team Members Management
- Deleted Notes
- Settings (placeholder)

### Features
- Rich text editor (Tiptap)
- Advanced data tables
- Drag & drop
- Charts & analytics
- Dark mode
- Toast notifications
- File upload UI
- Multi-select components
- Global search
- Advanced filtering

## 🎨 Customization

### Change Colors
Edit `tailwind.config.js`:
```js
colors: {
  primary: { /* your colors */ },
  // ...
}
```

### Change API URL
Edit `src/api/api.ts`:
```ts
const api = axios.create({
  baseURL: 'YOUR_API_URL',
});
```

### Add Your Branding
Edit:
- `src/components/layout/Sidebar.tsx` (app name)
- `index.html` (page title)
- `public/` (add logo images)

## 📚 Next Steps

1. ✅ Start the app (you're here!)
2. 📖 Read [SETUP.md](./SETUP.md) for detailed docs
3. 🎯 Check [README.md](./README.md) for features
4. 🔒 Add DOMPurify before production (see SETUP.md)
5. 🚀 Deploy (build with `npm run build`)

## 🐛 Found an Issue?

Check:
1. Node.js version (must be 18+)
2. Backend is running
3. No firewall blocking ports
4. Dependencies installed completely
5. Console for error messages

## 💡 Pro Tips

- Press `Ctrl/Cmd + K` to focus search
- Use grid view for visual browsing
- Use table view for bulk operations
- Filters persist in URL (shareable!)
- Dark mode is automatic at night

## 🎉 You're All Set!

Your modern Notes app is ready to use. Explore the features and enjoy!

---

**Need help?** Check the full documentation in SETUP.md
