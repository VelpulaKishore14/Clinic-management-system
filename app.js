// Main Application Logic
class ClinicManagementSystem {
  constructor() {
    this.currentUser = null
    this.currentUserRole = null
    this.selectedPatientId = null
    this.tokenCounter = 1
    this.unsubscribers = []
    this.allPrescriptions = []

    this.init()
  }

  init() {
    this.setupEventListeners()
    this.setupAuthStateListener()
    this.loadTokenCounter()
  }

  // Logging utility
  log(action, data = {}) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      action,
      user: this.currentUser ? this.currentUser.email || this.currentUser.uid : "anonymous",
      role: this.currentUserRole,
      data,
    }

    console.log("🏥 Clinic Management System Log:", logEntry)

    // Store logs in localStorage for persistence
    const logs = JSON.parse(localStorage.getItem("clinicLogs") || "[]")
    logs.push(logEntry)

    // Keep only last 100 logs
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100)
    }

    localStorage.setItem("clinicLogs", JSON.stringify(logs))
  }

  // Toast notification system
  showToast(message, type = "info", duration = 5000) {
    const toastContainer = document.getElementById("toastContainer")
    const toast = document.createElement("div")
    toast.className = `toast ${type} fade-in`

    const icons = {
      success: "fas fa-check-circle",
      error: "fas fa-exclamation-circle",
      warning: "fas fa-exclamation-triangle",
      info: "fas fa-info-circle",
    }

    toast.innerHTML = `
      <i class="${icons[type]} toast-icon"></i>
      <div class="flex-1">
        <p class="font-medium">${message}</p>
      </div>
      <button class="ml-4 text-gray-400 hover:text-gray-600" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `

    toastContainer.appendChild(toast)

    // Auto remove after duration
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove()
      }
    }, duration)
  }

  // Loading spinner
  showLoading() {
    document.getElementById("loadingSpinner").classList.remove("hidden")
  }

  hideLoading() {
    document.getElementById("loadingSpinner").classList.add("hidden")
  }

  // Setup event listeners
  setupEventListeners() {
    // Landing page buttons
    document.getElementById("doctorLoginBtn").addEventListener("click", () => {
      this.showLoginModal("doctor")
    })

    document.getElementById("receptionistLoginBtn").addEventListener("click", () => {
      this.showLoginModal("receptionist")
    })

    // Modal controls
    document.getElementById("closeModal").addEventListener("click", () => {
      this.hideLoginModal()
    })

    document.getElementById("closeRegisterModal").addEventListener("click", () => {
      this.hideRegisterModal()
    })

    document.getElementById("showRegister").addEventListener("click", () => {
      this.hideLoginModal()
      this.showRegisterModal()
    })

    document.getElementById("showLogin").addEventListener("click", () => {
      this.hideRegisterModal()
      this.showLoginModal(this.currentUserRole)
    })

    // Forms
    document.getElementById("loginForm").addEventListener("submit", (e) => {
      this.handleLogin(e)
    })

    document.getElementById("registerForm").addEventListener("submit", (e) => {
      this.handleRegister(e)
    })

    document.getElementById("patientForm").addEventListener("submit", (e) => {
      this.handlePatientRegistration(e)
    })

    document.getElementById("prescriptionForm").addEventListener("submit", (e) => {
      this.handlePrescriptionSubmission(e)
    })

    // Logout
    document.getElementById("logoutBtn").addEventListener("click", () => {
      this.handleLogout()
    })

    // History search
    document.getElementById("historySearch").addEventListener("input", (e) => {
      this.searchPatientHistory(e.target.value)
    })

    // Close modals on outside click
    document.getElementById("loginModal").addEventListener("click", (e) => {
      if (e.target.id === "loginModal") {
        this.hideLoginModal()
      }
    })

    document.getElementById("registerModal").addEventListener("click", (e) => {
      if (e.target.id === "registerModal") {
        this.hideRegisterModal()
      }
    })
  }

  // Authentication state listener
  setupAuthStateListener() {
    try {
      if (window.FirebaseUtils) {
        window.FirebaseUtils.onAuthStateChanged(async (user) => {
          if (user) {
            this.currentUser = user
            await this.loadUserRole()
            this.showDashboard()
          } else {
            this.currentUser = null
            this.currentUserRole = null
            this.showLandingPage()
          }
        })
      } else {
        console.error("Firebase utils not initialized")
        // Show landing page as fallback
        this.showLandingPage()
      }
    } catch (error) {
      console.error("Auth state listener setup failed:", error)
      this.showLandingPage()
    }
  }

  // Load user role
  async loadUserRole() {
    if (!this.currentUser) return

    // Try to get from users collection first
    const result = await window.FirebaseUtils.getDocument("users", this.currentUser.uid)
    if (result.success) {
      this.currentUserRole = result.data.role
      this.log("User role loaded", { role: this.currentUserRole })
    } else {
      // Fallback: check if it's stored in the user object (for localStorage fallback)
      if (this.currentUser.role) {
        this.currentUserRole = this.currentUser.role
      } else {
        // Default role assignment for demo
        this.currentUserRole = "receptionist"
      }
    }
  }

  // Load token counter from localStorage
  loadTokenCounter() {
    const today = new Date().toDateString()
    const savedDate = localStorage.getItem("tokenDate")

    if (savedDate === today) {
      this.tokenCounter = Number.parseInt(localStorage.getItem("tokenCounter") || "1")
    } else {
      this.tokenCounter = 1
      localStorage.setItem("tokenDate", today)
      localStorage.setItem("tokenCounter", "1")
    }
  }

  // Generate next token
  generateToken() {
    const token = this.tokenCounter
    this.tokenCounter++
    localStorage.setItem("tokenCounter", this.tokenCounter.toString())
    return token
  }

  // Modal functions
  showLoginModal(role) {
    this.currentUserRole = role || "user" // Add fallback
    document.getElementById("loginTitle").textContent = `Login as ${role.charAt(0).toUpperCase() + role.slice(1)}`
    document.getElementById("loginModal").classList.remove("hidden")
    document.getElementById("loginEmail").focus()
  }

  hideLoginModal() {
    document.getElementById("loginModal").classList.add("hidden")
    document.getElementById("loginForm").reset()
  }

  showRegisterModal() {
    const role = this.currentUserRole || "user" // Add fallback
    document.getElementById("registerTitle").textContent = `Register as ${role.charAt(0).toUpperCase() + role.slice(1)}`
    document.getElementById("registerModal").classList.remove("hidden")
    document.getElementById("registerName").focus()
  }

  hideRegisterModal() {
    document.getElementById("registerModal").classList.add("hidden")
    document.getElementById("registerForm").reset()
  }

  // Authentication handlers
  async handleLogin(e) {
    e.preventDefault()

    const email = document.getElementById("loginEmail").value
    const password = document.getElementById("loginPassword").value

    this.showLoading()

    const result = await window.FirebaseUtils.signIn(email, password)

    this.hideLoading()

    if (result.success) {
      this.log("User login successful", { email })
      this.showToast("Login successful!", "success")
      this.hideLoginModal()
    } else {
      this.log("User login failed", { email, error: result.error })
      this.showToast(result.error, "error")
    }
  }

  async handleRegister(e) {
    e.preventDefault()

    const name = document.getElementById("registerName").value
    const email = document.getElementById("registerEmail").value
    const password = document.getElementById("registerPassword").value

    this.showLoading()

    const userData = {
      name: name,
      role: this.currentUserRole,
    }

    const result = await window.FirebaseUtils.signUp(email, password, userData)

    this.hideLoading()

    if (result.success) {
      this.log("User registration successful", { email, role: this.currentUserRole })
      this.showToast("Registration successful!", "success")
      this.hideRegisterModal()
    } else {
      this.log("User registration failed", { email, error: result.error })
      this.showToast(result.error, "error")
    }
  }

  async handleLogout() {
    this.showLoading()

    // Clean up listeners
    this.unsubscribers.forEach((unsubscribe) => unsubscribe())
    this.unsubscribers = []

    const result = await window.FirebaseUtils.signOut()

    this.hideLoading()

    if (result.success) {
      this.log("User logout successful")
      this.showToast("Logged out successfully!", "success")
    } else {
      this.showToast(result.error, "error")
    }
  }

  // Page navigation
  showLandingPage() {
    document.getElementById("landingPage").classList.remove("hidden")
    document.getElementById("receptionistDashboard").classList.add("hidden")
    document.getElementById("doctorDashboard").classList.add("hidden")
    document.getElementById("navbar").classList.add("hidden")
  }

  showDashboard() {
    document.getElementById("landingPage").classList.add("hidden")
    document.getElementById("navbar").classList.remove("hidden")

    // Update navbar user info
    const userEmail = this.currentUser.email || this.currentUser.uid || "User"
    document.getElementById("userInfo").textContent =
      `${userEmail} (${this.currentUserRole.charAt(0).toUpperCase() + this.currentUserRole.slice(1)})`

    if (this.currentUserRole === "receptionist") {
      this.showReceptionistDashboard()
    } else if (this.currentUserRole === "doctor") {
      this.showDoctorDashboard()
    }
  }

  showReceptionistDashboard() {
    document.getElementById("receptionistDashboard").classList.remove("hidden")
    document.getElementById("doctorDashboard").classList.add("hidden")

    this.loadPatientQueue()
    this.loadBillingData()
  }

  showDoctorDashboard() {
    document.getElementById("doctorDashboard").classList.remove("hidden")
    document.getElementById("receptionistDashboard").classList.add("hidden")

    this.loadAssignedPatients()
    this.loadPatientHistory()
  }

  // Patient registration
  async handlePatientRegistration(e) {
    e.preventDefault()

    const patientData = {
      name: document.getElementById("patientName").value,
      age: Number.parseInt(document.getElementById("patientAge").value),
      gender: document.getElementById("patientGender").value,
      contact: document.getElementById("patientContact").value,
      symptoms: document.getElementById("patientSymptoms").value,
      token: this.generateToken(),
      status: "waiting",
      registeredBy: this.currentUser.uid || this.currentUser.email,
      date: new Date().toDateString(),
    }

    this.showLoading()

    const result = await window.FirebaseUtils.addDocument("patients", patientData)

    this.hideLoading()

    if (result.success) {
      this.log("Patient registered", {
        patientName: patientData.name,
        token: patientData.token,
      })
      this.showToast(`Patient registered successfully! Token: ${patientData.token}`, "success")
      document.getElementById("patientForm").reset()
    } else {
      this.log("Patient registration failed", { error: result.error })
      this.showToast(result.error, "error")
    }
  }

  // Load patient queue for receptionist
  loadPatientQueue() {
    const today = new Date().toDateString()

    const unsubscribe = window.FirebaseUtils.onCollectionChange(
      "patients",
      (patients) => {
        const todayPatients = patients.filter((p) => p.date === today)
        this.renderPatientQueue(todayPatients)
      },
      { field: "token", direction: "asc" },
    )

    this.unsubscribers.push(unsubscribe)
  }

  renderPatientQueue(patients) {
    const container = document.getElementById("patientQueue")

    if (patients.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-users text-4xl mb-4"></i>
          <p>No patients in queue today</p>
        </div>
      `
      return
    }

    container.innerHTML = patients.map((patient) => this.createPatientCard(patient)).join("")
  }

  createPatientCard(patient) {
    const statusClass =
      {
        waiting: "waiting",
        "with-doctor": "with-doctor",
        completed: "completed",
      }[patient.status] || "waiting"

    const statusText =
      {
        waiting: "Waiting",
        "with-doctor": "With Doctor",
        completed: "Completed",
      }[patient.status] || "Waiting"

    return `
      <div class="patient-card ${statusClass} fade-in">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="token-display">
              ${patient.token}
            </div>
            <div>
              <h3 class="text-lg font-bold">${patient.name}</h3>
              <p class="text-sm opacity-90">Age: ${patient.age} | ${patient.gender}</p>
              <p class="text-sm opacity-90">Contact: ${patient.contact}</p>
              <p class="text-sm opacity-90 mt-1">Symptoms: ${patient.symptoms}</p>
            </div>
          </div>
          <div class="text-right">
            <span class="status-badge status-${patient.status.replace("-", "")}">${statusText}</span>
            ${
              patient.status === "waiting"
                ? `
              <button onclick="window.app.sendToDoctor('${patient.id}')" 
                      class="btn-secondary mt-2 text-sm">
                <i class="fas fa-arrow-right mr-1"></i>
                Send to Doctor
              </button>
            `
                : ""
            }
          </div>
        </div>
      </div>
    `
  }

  // Send patient to doctor
  async sendToDoctor(patientId) {
    this.showLoading()

    const result = await window.FirebaseUtils.updateDocument("patients", patientId, {
      status: "with-doctor",
      assignedAt: Date.now(),
    })

    this.hideLoading()

    if (result.success) {
      this.log("Patient sent to doctor", { patientId })
      this.showToast("Patient sent to doctor successfully!", "success")
    } else {
      this.showToast(result.error, "error")
    }
  }

  // Load assigned patients for doctor
  loadAssignedPatients() {
    const today = new Date().toDateString()

    const unsubscribe = window.FirebaseUtils.onCollectionChange(
      "patients",
      (patients) => {
        const assignedPatients = patients.filter((p) => p.date === today && p.status === "with-doctor")
        this.renderAssignedPatients(assignedPatients)
      },
      { field: "assignedAt", direction: "asc" },
    )

    this.unsubscribers.push(unsubscribe)
  }

  renderAssignedPatients(patients) {
    const container = document.getElementById("assignedPatients")

    if (patients.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-user-md text-4xl mb-4"></i>
          <p>No patients assigned today</p>
        </div>
      `
      return
    }

    container.innerHTML = patients
      .map(
        (patient) => `
      <div class="patient-card with-doctor cursor-pointer" onclick="window.app.selectPatient('${patient.id}')">
        <div class="flex items-center space-x-4">
          <div class="token-display">
            ${patient.token}
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold">${patient.name}</h3>
            <p class="text-sm opacity-90">Age: ${patient.age} | ${patient.gender}</p>
            <p class="text-sm opacity-90">Contact: ${patient.contact}</p>
            <p class="text-sm opacity-90 mt-1">Symptoms: ${patient.symptoms}</p>
          </div>
          <div class="text-right">
            <i class="fas fa-chevron-right text-xl"></i>
          </div>
        </div>
      </div>
    `,
      )
      .join("")
  }

  // Select patient for prescription
  async selectPatient(patientId) {
    this.selectedPatientId = patientId

    const result = await window.FirebaseUtils.getDocument("patients", patientId)

    if (result.success) {
      const patient = result.data
      this.renderSelectedPatientInfo(patient)
      document.getElementById("prescriptionForm").classList.remove("hidden")
    } else {
      this.showToast("Error loading patient data", "error")
    }
  }

  renderSelectedPatientInfo(patient) {
    const container = document.getElementById("selectedPatientInfo")

    container.innerHTML = `
      <div class="bg-gray-50 rounded-lg p-4 mb-4">
        <div class="flex items-center space-x-3 mb-3">
          <div class="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold">
            ${patient.token}
          </div>
          <div>
            <h3 class="text-lg font-bold text-gray-800">${patient.name}</h3>
            <p class="text-sm text-gray-600">Age: ${patient.age} | ${patient.gender}</p>
          </div>
        </div>
        <div class="space-y-2 text-sm">
          <p><strong>Contact:</strong> ${patient.contact}</p>
          <p><strong>Symptoms:</strong> ${patient.symptoms}</p>
          <p><strong>Status:</strong> <span class="status-badge status-withdoctor">With Doctor</span></p>
        </div>
      </div>
    `
  }

  // Handle prescription submission
  async handlePrescriptionSubmission(e) {
    e.preventDefault()

    if (!this.selectedPatientId) {
      this.showToast("Please select a patient first", "error")
      return
    }

    const prescriptionData = {
      patientId: this.selectedPatientId,
      doctorId: this.currentUser.uid || this.currentUser.email,
      diagnosis: document.getElementById("diagnosis").value,
      prescription: document.getElementById("prescription").value,
      consultationFee: Number.parseFloat(document.getElementById("consultationFee").value),
      medicineCost: Number.parseFloat(document.getElementById("medicineCost").value) || 0,
      date: new Date().toDateString(),
      timestamp: Date.now(),
    }

    this.showLoading()

    // Save prescription
    const prescriptionResult = await window.FirebaseUtils.addDocument("prescriptions", prescriptionData)

    if (prescriptionResult.success) {
      // Update patient status
      const patientResult = await window.FirebaseUtils.updateDocument("patients", this.selectedPatientId, {
        status: "completed",
        completedAt: Date.now(),
        prescriptionId: prescriptionResult.id,
      })

      if (patientResult.success) {
        // Create billing record
        const billingData = {
          patientId: this.selectedPatientId,
          prescriptionId: prescriptionResult.id,
          consultationFee: prescriptionData.consultationFee,
          medicineCost: prescriptionData.medicineCost,
          totalAmount: prescriptionData.consultationFee + prescriptionData.medicineCost,
          status: "pending",
          date: new Date().toDateString(),
        }

        await window.FirebaseUtils.addDocument("billing", billingData)

        this.hideLoading()

        this.log("Prescription submitted", {
          patientId: this.selectedPatientId,
          prescriptionId: prescriptionResult.id,
        })

        this.showToast("Prescription saved successfully!", "success")

        // Reset form
        document.getElementById("prescriptionForm").reset()
        document.getElementById("prescriptionForm").classList.add("hidden")
        document.getElementById("selectedPatientInfo").innerHTML =
          '<p class="text-gray-600 text-center py-8">Select a patient to view details</p>'
        this.selectedPatientId = null
      } else {
        this.hideLoading()
        this.showToast("Error updating patient status", "error")
      }
    } else {
      this.hideLoading()
      this.showToast("Error saving prescription", "error")
    }
  }

  // Load billing data for receptionist
  loadBillingData() {
    const today = new Date().toDateString()

    const unsubscribe = window.FirebaseUtils.onCollectionChange(
      "billing",
      (billingRecords) => {
        const todayBilling = billingRecords.filter((b) => b.date === today)
        this.renderBillingTable(todayBilling)
      },
      { field: "createdAt", direction: "desc" },
    )

    this.unsubscribers.push(unsubscribe)
  }

  async renderBillingTable(billingRecords) {
    const tbody = document.getElementById("billingTable")

    if (billingRecords.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-8 text-gray-500">
            <i class="fas fa-receipt text-4xl mb-4 block"></i>
            No billing records for today
          </td>
        </tr>
      `
      return
    }

    // Get patient data for each billing record
    const billingWithPatients = await Promise.all(
      billingRecords.map(async (billing) => {
        const patientResult = await window.FirebaseUtils.getDocument("patients", billing.patientId)
        return {
          ...billing,
          patient: patientResult.success ? patientResult.data : null,
        }
      }),
    )

    tbody.innerHTML = billingWithPatients
      .map(
        (billing) => `
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="px-4 py-3">
          <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
            ${billing.patient ? billing.patient.token : "N/A"}
          </span>
        </td>
        <td class="px-4 py-3 font-medium">${billing.patient ? billing.patient.name : "Unknown"}</td>
        <td class="px-4 py-3">₹${billing.consultationFee.toFixed(2)}</td>
        <td class="px-4 py-3">₹${billing.medicineCost.toFixed(2)}</td>
        <td class="px-4 py-3 font-bold">₹${billing.totalAmount.toFixed(2)}</td>
        <td class="px-4 py-3">
          <span class="status-badge ${billing.status === "paid" ? "status-completed" : "status-waiting"}">
            ${billing.status.charAt(0).toUpperCase() + billing.status.slice(1)}
          </span>
        </td>
        <td class="px-4 py-3">
          ${
            billing.status === "pending"
              ? `
            <button onclick="window.app.markAsPaid('${billing.id}')" 
                    class="btn-secondary text-sm">
              <i class="fas fa-check mr-1"></i>Mark Paid
            </button>
          `
              : `
            <button onclick="window.app.printBill('${billing.id}')" 
                    class="btn-primary text-sm">
              <i class="fas fa-print mr-1"></i>Print
            </button>
          `
          }
        </td>
      </tr>
    `,
      )
      .join("")
  }

  // Mark billing as paid
  async markAsPaid(billingId) {
    this.showLoading()

    const result = await window.FirebaseUtils.updateDocument("billing", billingId, {
      status: "paid",
      paidAt: Date.now(),
    })

    this.hideLoading()

    if (result.success) {
      this.log("Bill marked as paid", { billingId })
      this.showToast("Bill marked as paid successfully!", "success")
    } else {
      this.showToast("Error updating bill status", "error")
    }
  }

  // Print bill
  async printBill(billingId) {
    const billingResult = await window.FirebaseUtils.getDocument("billing", billingId)
    if (!billingResult.success) {
      this.showToast("Error loading bill data", "error")
      return
    }

    const billing = billingResult.data
    const patientResult = await window.FirebaseUtils.getDocument("patients", billing.patientId)
    const patient = patientResult.success ? patientResult.data : null

    if (!patient) {
      this.showToast("Error loading patient data", "error")
      return
    }

    // Create print window
    const printWindow = window.open("", "_blank")
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill - Token ${patient.token}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .bill-details { margin-bottom: 20px; }
          .bill-table { width: 100%; border-collapse: collapse; }
          .bill-table th, .bill-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          .bill-table th { background-color: #f5f5f5; }
          .total { font-weight: bold; font-size: 1.2em; }
          .footer { margin-top: 30px; text-align: center; font-size: 0.9em; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Clinic Management System</h1>
          <h2>Medical Bill</h2>
        </div>
        
        <div class="bill-details">
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Token Number:</strong> ${patient.token}</p>
          <p><strong>Patient Name:</strong> ${patient.name}</p>
          <p><strong>Age:</strong> ${patient.age}</p>
          <p><strong>Gender:</strong> ${patient.gender}</p>
          <p><strong>Contact:</strong> ${patient.contact}</p>
        </div>
        
        <table class="bill-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Consultation Fee</td>
              <td>₹${billing.consultationFee.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Medicine Cost</td>
              <td>₹${billing.medicineCost.toFixed(2)}</td>
            </tr>
            <tr class="total">
              <td>Total Amount</td>
              <td>₹${billing.totalAmount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          <p>Thank you for visiting our clinic!</p>
          <p>Get well soon!</p>
        </div>
      </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.print()

    this.log("Bill printed", { billingId, patientToken: patient.token })
  }

  // Load patient history for doctor
  loadPatientHistory() {
    const unsubscribe = window.FirebaseUtils.onCollectionChange(
      "prescriptions",
      (prescriptions) => {
        this.allPrescriptions = prescriptions
        this.renderPatientHistory(prescriptions)
      },
      { field: "timestamp", direction: "desc" },
    )

    this.unsubscribers.push(unsubscribe)
  }

  async renderPatientHistory(prescriptions) {
    const container = document.getElementById("patientHistory")

    if (prescriptions.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-history text-4xl mb-4"></i>
          <p>No patient history available</p>
        </div>
      `
      return
    }

    // Get patient data for each prescription
    const historyWithPatients = await Promise.all(
      prescriptions.map(async (prescription) => {
        const patientResult = await window.FirebaseUtils.getDocument("patients", prescription.patientId)
        return {
          ...prescription,
          patient: patientResult.success ? patientResult.data : null,
        }
      }),
    )

    container.innerHTML = historyWithPatients
      .map(
        (history) => `
      <div class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-3">
            <div class="bg-purple-100 text-purple-800 rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm">
              ${history.patient ? history.patient.token : "N/A"}
            </div>
            <div>
              <h3 class="text-lg font-bold text-gray-800">${history.patient ? history.patient.name : "Unknown Patient"}</h3>
              <p class="text-sm text-gray-600">${history.date}</p>
            </div>
          </div>
          <button onclick="window.app.viewPrescriptionDetails('${history.id}')" 
                  class="text-blue-600 hover:text-blue-800 text-sm font-medium">
            <i class="fas fa-eye mr-1"></i>View Details
          </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-gray-600 mb-1">Diagnosis:</p>
            <p class="font-medium">${history.diagnosis}</p>
          </div>
          <div>
            <p class="text-gray-600 mb-1">Prescription:</p>
            <p class="font-medium">${history.prescription}</p>
          </div>
        </div>
      </div>
    `,
      )
      .join("")
  }

  // Search patient history
  searchPatientHistory(searchTerm) {
    if (!this.allPrescriptions) return

    const filteredPrescriptions = this.allPrescriptions.filter((prescription) => {
      return (
        prescription.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prescription.prescription.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })

    this.renderPatientHistory(filteredPrescriptions)
  }

  // View prescription details
  async viewPrescriptionDetails(prescriptionId) {
    const prescriptionResult = await window.FirebaseUtils.getDocument("prescriptions", prescriptionId)
    if (!prescriptionResult.success) {
      this.showToast("Error loading prescription details", "error")
      return
    }

    const prescription = prescriptionResult.data
    const patientResult = await window.FirebaseUtils.getDocument("patients", prescription.patientId)
    const patient = patientResult.success ? patientResult.data : null

    // Create modal for prescription details
    const modal = document.createElement("div")
    modal.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-800">Prescription Details</h2>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="space-y-4">
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="font-bold text-lg mb-2">Patient Information</h3>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <p><strong>Name:</strong> ${patient ? patient.name : "Unknown"}</p>
              <p><strong>Token:</strong> ${patient ? patient.token : "N/A"}</p>
              <p><strong>Age:</strong> ${patient ? patient.age : "N/A"}</p>
              <p><strong>Gender:</strong> ${patient ? patient.gender : "N/A"}</p>
              <p><strong>Contact:</strong> ${patient ? patient.contact : "N/A"}</p>
              <p><strong>Date:</strong> ${prescription.date}</p>
            </div>
          </div>
          
          <div>
            <h3 class="font-bold text-lg mb-2">Diagnosis</h3>
            <p class="bg-gray-50 rounded-lg p-4">${prescription.diagnosis}</p>
          </div>
          
          <div>
            <h3 class="font-bold text-lg mb-2">Prescription</h3>
            <p class="bg-gray-50 rounded-lg p-4">${prescription.prescription}</p>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <h3 class="font-bold text-lg mb-2">Consultation Fee</h3>
              <p class="bg-green-50 text-green-800 rounded-lg p-4 font-bold">₹${prescription.consultationFee.toFixed(2)}</p>
            </div>
            <div>
              <h3 class="font-bold text-lg mb-2">Medicine Cost</h3>
              <p class="bg-blue-50 text-blue-800 rounded-lg p-4 font-bold">₹${prescription.medicineCost.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    this.log("Prescription details viewed", { prescriptionId })
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Wait for Firebase to be fully loaded
  const initializeApp = () => {
    if (window.FirebaseUtils) {
      const app = new ClinicManagementSystem()
      // Make app globally available for onclick handlers
      window.app = app
      console.log("🏥 Clinic Management System initialized successfully!")
    } else {
      // Retry after a short delay if Firebase isn't ready
      setTimeout(initializeApp, 500)
    }
  }

  initializeApp()
})

// Add keyboard shortcuts
document.addEventListener("keydown", (e) => {
  // Ctrl/Cmd + L for logout
  if ((e.ctrlKey || e.metaKey) && e.key === "l") {
    e.preventDefault()
    if (window.app && window.app.currentUser) {
      window.app.handleLogout()
    }
  }

  // Escape to close modals
  if (e.key === "Escape") {
    const loginModal = document.getElementById("loginModal")
    const registerModal = document.getElementById("registerModal")

    if (loginModal && !loginModal.classList.contains("hidden")) {
      window.app.hideLoginModal()
    }
    if (registerModal && !registerModal.classList.contains("hidden")) {
      window.app.hideRegisterModal()
    }
  }
})

// Add error boundary for unhandled errors
window.addEventListener("error", (e) => {
  console.error("Unhandled error:", e.error)
  if (window.app) {
    window.app.showToast("An unexpected error occurred. Please refresh the page.", "error")
  }
})

window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled promise rejection:", e.reason)
  if (window.app) {
    window.app.showToast("An unexpected error occurred. Please try again.", "error")
  }
})

// Add network status monitoring
window.addEventListener("online", () => {
  if (window.app) {
    window.app.showToast("Connection restored", "success")
  }
})

window.addEventListener("offline", () => {
  if (window.app) {
    window.app.showToast("Connection lost. Some features may not work.", "warning")
  }
})
