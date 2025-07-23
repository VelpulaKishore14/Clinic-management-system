// Firebase Configuration using v8 SDK (no imports needed - loaded via script tags)
const firebaseConfig = {
  apiKey: "AIzaSyBb76fMM8QJ64PCu-Ftf2aDSmy36wwUZ-c",
  authDomain: "clinicmanagementsystem-7db15.firebaseapp.com",
  databaseURL: "https://clinicmanagementsystem-7db15-default-rtdb.firebaseio.com",
  projectId: "clinicmanagementsystem-7db15",
  storageBucket: "clinicmanagementsystem-7db15.appspot.com",
  messagingSenderId: "1061924590868",
  appId: "1:1061924590868:web:fc20094f28450feb0d5e01",
}

// Declare the firebase variable before using it
const firebase = window.firebase

// Initialize Firebase services
let app, auth, db, realtimeDb

try {
  // Check if Firebase is available
  if (typeof firebase === "undefined") {
    throw new Error("Firebase SDK not loaded")
  }

  // Initialize Firebase app
  app = firebase.initializeApp(firebaseConfig)
  console.log("🔥 Firebase app initialized successfully!")

  // Initialize Realtime Database
  try {
    if (firebase.database) {
      realtimeDb = firebase.database()
      console.log("🔥 Firebase Realtime Database initialized successfully!")
    } else {
      throw new Error("Firebase Database SDK not loaded")
    }
  } catch (dbError) {
    console.error("❌ Firebase Realtime Database initialization failed:", dbError.message)
    realtimeDb = null
  }

  // Try to initialize Auth (might fail if not enabled)
  try {
    if (firebase.auth) {
      auth = firebase.auth()
      console.log("🔥 Firebase Auth initialized successfully!")
    } else {
      throw new Error("Firebase Auth SDK not loaded")
    }
  } catch (authError) {
    console.warn("⚠️ Firebase Auth not available:", authError.message)
    auth = null
  }

  // Try to initialize Firestore (might fail if not enabled)
  try {
    if (firebase.firestore) {
      db = firebase.firestore()
      console.log("🔥 Firebase Firestore initialized successfully!")
    } else {
      console.warn("⚠️ Firebase Firestore SDK not loaded")
      db = null
    }
  } catch (firestoreError) {
    console.warn("⚠️ Firebase Firestore not available:", firestoreError.message)
    db = null
  }
} catch (error) {
  console.error("❌ Firebase initialization failed:", error.message)
  // Set all services to null if initialization fails
  app = null
  auth = null
  db = null
  realtimeDb = null
}

// Firebase utility functions with comprehensive fallbacks
const FirebaseUtils = {
  // Check if Firebase services are available
  isFirebaseAvailable() {
    return realtimeDb !== null
  },

  // Authentication functions (fallback to localStorage-based auth)
  async signUp(email, password, userData) {
    try {
      if (auth) {
        // Use Firebase Auth if available
        const userCredential = await auth.createUserWithEmailAndPassword(email, password)
        const user = userCredential.user

        // Save user data to Realtime Database
        if (realtimeDb) {
          await realtimeDb.ref("users/" + user.uid).set({
            ...userData,
            email: email,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            uid: user.uid,
          })
        }

        return { success: true, user: user }
      } else {
        // Fallback: Use localStorage for demo purposes
        const users = JSON.parse(localStorage.getItem("clinic_users") || "[]")

        // Check if user already exists
        if (users.find((u) => u.email === email)) {
          return { success: false, error: "User already exists" }
        }

        // Create new user
        const newUser = {
          uid: "user_" + Date.now(),
          email: email,
          ...userData,
          createdAt: new Date().toISOString(),
        }

        users.push(newUser)
        localStorage.setItem("clinic_users", JSON.stringify(users))
        localStorage.setItem("clinic_current_user", JSON.stringify(newUser))

        return { success: true, user: newUser }
      }
    } catch (error) {
      console.error("Sign up error:", error)
      return { success: false, error: error.message || "Registration failed" }
    }
  },

  async signIn(email, password) {
    try {
      if (auth) {
        // Use Firebase Auth if available
        const userCredential = await auth.signInWithEmailAndPassword(email, password)
        return { success: true, user: userCredential.user }
      } else {
        // Fallback: Use localStorage
        const users = JSON.parse(localStorage.getItem("clinic_users") || "[]")
        const user = users.find((u) => u.email === email)

        if (!user) {
          return { success: false, error: "User not found. Please register first." }
        }

        localStorage.setItem("clinic_current_user", JSON.stringify(user))
        return { success: true, user: user }
      }
    } catch (error) {
      console.error("Sign in error:", error)
      return { success: false, error: error.message || "Login failed" }
    }
  },

  async signOut() {
    try {
      if (auth) {
        await auth.signOut()
      } else {
        // Fallback: Clear localStorage
        localStorage.removeItem("clinic_current_user")
      }
      return { success: true }
    } catch (error) {
      console.error("Sign out error:", error)
      return { success: false, error: error.message }
    }
  },

  // Data functions using Realtime Database or localStorage fallback
  async addDocument(collection, data) {
    try {
      if (realtimeDb) {
        // Use Firebase Realtime Database
        const docId = "doc_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)

        await realtimeDb.ref(collection + "/" + docId).set({
          ...data,
          id: docId,
          createdAt: firebase.database.ServerValue.TIMESTAMP,
          updatedAt: firebase.database.ServerValue.TIMESTAMP,
        })

        return { success: true, id: docId }
      } else {
        // Fallback: Use localStorage
        const docId = "doc_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
        const documents = JSON.parse(localStorage.getItem("clinic_" + collection) || "[]")

        const newDoc = {
          ...data,
          id: docId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        documents.push(newDoc)
        localStorage.setItem("clinic_" + collection, JSON.stringify(documents))

        return { success: true, id: docId }
      }
    } catch (error) {
      console.error("Add document error:", error)
      return { success: false, error: error.message }
    }
  },

  async updateDocument(collection, docId, data) {
    try {
      if (realtimeDb) {
        await realtimeDb.ref(collection + "/" + docId).update({
          ...data,
          updatedAt: firebase.database.ServerValue.TIMESTAMP,
        })
      } else {
        // Fallback: Use localStorage
        const documents = JSON.parse(localStorage.getItem("clinic_" + collection) || "[]")
        const index = documents.findIndex((doc) => doc.id === docId)

        if (index !== -1) {
          documents[index] = {
            ...documents[index],
            ...data,
            updatedAt: Date.now(),
          }
          localStorage.setItem("clinic_" + collection, JSON.stringify(documents))
        }
      }
      return { success: true }
    } catch (error) {
      console.error("Update document error:", error)
      return { success: false, error: error.message }
    }
  },

  async getDocument(collection, docId) {
    try {
      if (realtimeDb) {
        const snapshot = await realtimeDb.ref(collection + "/" + docId).once("value")
        if (snapshot.exists()) {
          return { success: true, data: snapshot.val() }
        } else {
          return { success: false, error: "Document not found" }
        }
      } else {
        // Fallback: Use localStorage
        const documents = JSON.parse(localStorage.getItem("clinic_" + collection) || "[]")
        const doc = documents.find((d) => d.id === docId)

        if (doc) {
          return { success: true, data: doc }
        } else {
          return { success: false, error: "Document not found" }
        }
      }
    } catch (error) {
      console.error("Get document error:", error)
      return { success: false, error: error.message }
    }
  },

  async getCollection(collection, orderBy = null, limit = null) {
    try {
      if (realtimeDb) {
        let query = realtimeDb.ref(collection)

        if (orderBy) {
          query = query.orderByChild(orderBy.field)
        }

        if (limit) {
          query = query.limitToFirst(limit)
        }

        const snapshot = await query.once("value")
        const documents = []

        snapshot.forEach((child) => {
          documents.push(child.val())
        })

        return { success: true, data: documents }
      } else {
        // Fallback: Use localStorage
        let documents = JSON.parse(localStorage.getItem("clinic_" + collection) || "[]")

        if (orderBy) {
          documents.sort((a, b) => {
            const aVal = a[orderBy.field]
            const bVal = b[orderBy.field]
            return orderBy.direction === "desc" ? bVal - aVal : aVal - bVal
          })
        }

        if (limit) {
          documents = documents.slice(0, limit)
        }

        return { success: true, data: documents }
      }
    } catch (error) {
      console.error("Get collection error:", error)
      return { success: false, error: error.message }
    }
  },

  async deleteDocument(collection, docId) {
    try {
      if (realtimeDb) {
        await realtimeDb.ref(collection + "/" + docId).remove()
      } else {
        // Fallback: Use localStorage
        const documents = JSON.parse(localStorage.getItem("clinic_" + collection) || "[]")
        const filteredDocs = documents.filter((doc) => doc.id !== docId)
        localStorage.setItem("clinic_" + collection, JSON.stringify(filteredDocs))
      }
      return { success: true }
    } catch (error) {
      console.error("Delete document error:", error)
      return { success: false, error: error.message }
    }
  },

  // Real-time listeners
  onCollectionChange(collection, callback, orderBy = null) {
    if (realtimeDb) {
      let query = realtimeDb.ref(collection)

      if (orderBy) {
        query = query.orderByChild(orderBy.field)
      }

      const listener = query.on("value", (snapshot) => {
        const documents = []
        snapshot.forEach((child) => {
          documents.push(child.val())
        })
        callback(documents)
      })

      // Return unsubscribe function
      return () => {
        realtimeDb.ref(collection).off("value", listener)
      }
    } else {
      // Fallback: Poll localStorage
      const pollInterval = setInterval(() => {
        const documents = JSON.parse(localStorage.getItem("clinic_" + collection) || "[]")
        callback(documents)
      }, 1000)

      return () => clearInterval(pollInterval)
    }
  },

  onDocumentChange(collection, docId, callback) {
    if (realtimeDb) {
      const listener = realtimeDb.ref(collection + "/" + docId).on("value", (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.val())
        } else {
          callback(null)
        }
      })

      // Return unsubscribe function
      return () => {
        realtimeDb.ref(collection + "/" + docId).off("value", listener)
      }
    } else {
      // Fallback: Poll localStorage
      const pollInterval = setInterval(() => {
        const documents = JSON.parse(localStorage.getItem("clinic_" + collection) || "[]")
        const doc = documents.find((d) => d.id === docId)
        callback(doc || null)
      }, 1000)

      return () => clearInterval(pollInterval)
    }
  },

  // Auth state listener
  onAuthStateChanged(callback) {
    if (auth) {
      return auth.onAuthStateChanged(callback)
    } else {
      // Fallback: Check localStorage periodically
      const checkAuth = () => {
        const user = localStorage.getItem("clinic_current_user")
        callback(user ? JSON.parse(user) : null)
      }

      checkAuth() // Initial check
      const interval = setInterval(checkAuth, 1000)

      return () => clearInterval(interval)
    }
  },
}

// Make Firebase utilities globally available
window.FirebaseUtils = FirebaseUtils
window.auth = auth
window.db = db
window.realtimeDb = realtimeDb
window.firebase = firebase

console.log("🔥 Firebase initialized successfully!")
