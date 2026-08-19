rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ========== TRACKS ==========
    match /tracks/{trackId} {
      allow read: if true;
      allow create, update, delete: if true; // Контроль на клиенте через PIN
      
      // Comments subcollection
      match /comments/{commentId} {
        allow read: if true;
        allow create, update, delete: if true;
      }
    }

    // ========== USERS (Firebase Auth user data) ==========
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // ========== PLAYLISTS ==========
    match /playlists/{playlistId} {
      allow read: if true;
      allow create, update, delete: if true;
    }

    // ========== CONFIG ==========
    match /config/{docId} {
      allow read: if true;
      allow write: if true;
    }

    // ========== USER LISTENS ==========
    match /userListens/{userId}/tracks/{trackId} {
      allow read, write: if true;
    }

    // ========== CHAT ==========
    match /chat_messages/{msgId} {
      allow read, write: if true;
      allow delete: if true;
    }

    match /deleted_messages/{msgId} {
      allow read, write, create, update, delete: if true;
    }

    match /chat_typing/{role} {
      allow read, write: if true;
    }

    match /chat_presence/{role} {
      allow read, write: if true;
    }

    // ========== PROFILES ==========
    match /profiles/{roleId} {
      allow read: if true;
      allow write: if true;
    }

    // ========== REACTIONS ==========
    match /user_reactions/{role} {
      allow read, write: if true;
    }

    // ========== USER SETTINGS ==========
    match /userSettings/{userId} {
      allow read, write: if true;
    }
    
  }
}