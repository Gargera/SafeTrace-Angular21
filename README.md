# Profile Photo: Remove + Crop-on-Upload

## Install

```bash
npm install ngx-image-cropper
```

Requires `@angular/material` (`MatDialogModule`, `MatButtonModule`, `MatIconModule`,
`MatSliderModule`, `MatSnackBarModule`, `MatProgressSpinnerModule`) and
`HttpClientModule`/`provideHttpClient()` already set up in your app config.

## Files

```
frontend/
  profile-image.service.ts            → upload/remove HTTP calls (signals for loading state)
  image-validation.util.ts            → type/size validation before opening the cropper
  confirm-dialog/                     → generic reusable M3 confirm dialog
  image-crop-dialog/                  → ngx-image-cropper modal (drag, zoom, circular preview)
  edit-profile.component.ts/.html/.scss → integration example for your Edit Profile page

backend/
  RemoveProfileImage.cs               → the missing DELETE endpoint + service method
```

## Wiring it into your real project

1. Copy `profile-image.service.ts`, `image-validation.util.ts`, `confirm-dialog/`
   and `image-crop-dialog/` into your shared/core folders as-is — they have no
   dependency on the rest of `edit-profile.component.ts`.
2. `edit-profile.component.ts` is a **self-contained reference implementation**.
   Merge its `openFilePicker`, `onFileSelected`, `openCropDialog`,
   `uploadCroppedImage`, `confirmRemoveProfileImage`, and `removeProfileImage`
   methods into your actual component, replacing the placeholder `user` signal
   with your real user store/resolver and calling its refresh method after a
   successful upload/remove instead of mutating a local signal.
3. In `RemoveProfileImage.cs`, swap `AppDbContext`, `User`, `ICurrentUserService`
   for your actual EF Core context, entity, and current-user accessor. It relies
   entirely on the `DeleteFile` method that already exists in your
   `FileStorageService` — no changes needed there.
4. Confirm the frontend route `/api/users/profile-image` matches your API's
   routing convention (adjust `baseUrl` in `profile-image.service.ts` if not).

## Flow implemented

- **Remove**: confirm dialog → optimistic preview clear → `DELETE` call →
  rollback on failure → success snackbar.
- **Change photo**: file picked → client-side type/size validation (jpg/png/webp,
  5 MB max) → crop dialog (drag/zoom/circular preview, Esc and backdrop-click
  to cancel) → only on **Save** is the cropped `Blob` uploaded via `FormData` →
  refresh → success snackbar. Cancelling the crop dialog leaves the original
  image untouched.
