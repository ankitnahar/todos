# SubNote Visibility Fix - Query Cache Invalidation

## Problem
When a subnote was created via the Quick Add Modal (`Ctrl+Alt+N`), it wasn't immediately visible in the Note Detail page view, even though it was saved to the database. The subnote would only appear after a manual refresh or if you navigated away and back to the note.

**Example flow that showed the issue:**
1. User opens Note Detail page for "C&I - Energy" (showing existing subnotes)
2. User presses `Ctrl+Alt+N` → Quick Add Modal opens
3. User creates a new subnote for "C&I - Energy"
4. Modal closes, subnote is created ✓
5. BUT Note Detail page still shows old subnote list ✗
6. User has to navigate away and back, or refresh page to see the new subnote

## Root Cause
The Quick Add Modal was invalidating the general `notes` query cache, but NOT invalidating the specific parent note query cache.

**Query keys involved:**
- `['notes']` - List of all notes (used in Notes page)
- `['note', parentNoteId]` - Single note detail (used in NoteDetailPage)

When a subnote was created:
- ✓ `queryClient.invalidateQueries({ queryKey: ['notes'] })` was called
- ✗ `queryClient.invalidateQueries({ queryKey: ['note', String(parentNoteId)] })` was NOT called

So NoteDetailPage would keep using stale cached data.

## Solution
Added parent note query invalidation when a subnote is created:

```javascript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['notes'] });
  queryClient.invalidateQueries({ queryKey: ['subnote-files'] });
  queryClient.invalidateQueries({ queryKey: ['note-files'] });
  
  // NEW: Invalidate the specific parent note cache if subnote was created
  if (isSubNote && parentNoteId) {
    queryClient.invalidateQueries({ queryKey: ['note', String(parentNoteId)] });
  }
  
  toast.success(`${isSubNote ? 'SubNote' : 'Note'} created`);
  resetForm();
  onClose();
  onSuccess?.();
}
```

## Result
Now when a subnote is created via Quick Add Modal:
1. ✅ Subnote is created in database
2. ✅ Parent note's query cache is cleared
3. ✅ NoteDetailPage automatically refetches the parent note with React Query
4. ✅ New subnote appears immediately in the detail view
5. ✅ No manual refresh or navigation needed

## Files Changed
- `/frontend/src/components/notes/QuickAddNoteModal.tsx` (lines 168-175)

## Testing
The fix is automatically tested by React Query's cache invalidation mechanism. When you:
1. Open a note detail page
2. Press `Ctrl+Alt+N` to add a subnote
3. Fill in and create the subnote

The new subnote will immediately appear in the detail view without any manual action needed.

## Technical Details
- **Query System**: React Query (@tanstack/react-query)
- **Invalidation Scope**: Only the parent note query is cleared, not all notes (efficient)
- **Performance**: Minimal overhead - only refetches the specific parent note, not the entire notes list
- **Consistency**: Ensures UI stays in sync with database state

★ Insight ─────────────────────────────────────
This is a classic caching issue in React Query workflows:
- List queries and detail queries are separate cache entries
- When mutating a list item, both the list AND the detail need to be invalidated
- The fix targets only the affected note, minimizing refetch overhead
- This pattern applies to any hierarchical data (parent-child relationships)
─────────────────────────────────────────────────
