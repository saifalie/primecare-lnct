const translations = {
  hi: {
    // Welcome
    namaste: 'नमस्ते 🙏',
    tagline: 'आपका स्वास्थ्य, हमारी प्राथमिकता',
    daily_checkup: 'दैनिक जांच',
    special_diagnosis: 'विशेष निदान',
    daily_checkup_sub: '8 जांच • 4 मिनट',
    special_diagnosis_sub: 'लक्षण बताएं • AI निदान',

    // Language
    select_language: 'अपनी भाषा चुनें',

    // Registration
    register_title: 'नया पंजीकरण',
    name: 'पूरा नाम',
    age: 'आयु',
    gender: 'लिंग',
    male: 'पुरुष',
    female: 'महिला',
    other: 'अन्य',
    village: 'गाँव का नाम',
    role: 'आप क्या हैं?',
    farmer: 'किसान',
    labour: 'मजदूर',
    homemaker: 'गृहिणी',
    elderly: 'बुजुर्ग',
    student: 'छात्र',
    mobile: 'मोबाइल नंबर',
    submit: 'जमा करें',
    already_registered: 'पहले से पंजीकृत हैं?',

    // Login
    login_title: 'वापस आए? लॉगिन करें',
    scan_qr: 'QR स्कैन करें',
    enter_mobile: 'मोबाइल नंबर',
    new_patient: 'नए मरीज़? पंजीकरण करें',

    // Steps
    step_temperature: 'तापमान',
    step_heart: 'हृदय गति',
    step_ecg: 'ECG',
    step_eye: 'आँख जांच',
    step_bp: 'रक्तचाप',
    step_height: 'ऊँचाई',
    step_weight: 'वज़न',
    step_mental: 'मानसिक स्वास्थ्य',

    // Temperature screen
    temp_instruction: 'अपनी कलाई सेंसर के पास लाएं',
    temp_reading: 'तापमान माप रहे हैं...',
    temp_done: 'तापमान लिया गया',

    // Heart rate screen
    hr_instruction: 'उंगली स्लॉट में डालें',
    hr_reading: 'हृदय गति माप रहे हैं...',
    finger_not_detected: 'उंगली ठीक से नहीं लगी',

    // ECG screen
    ecg_instruction: 'दोनों हथेलियाँ पैड पर रखें',
    ecg_recording: 'ECG रिकॉर्ड हो रही है...',
    leads_disconnected: 'पैड से हाथ न हटाएं',

    // Eye screen
    eye_instruction: 'आँख हुड के पास लाएं',
    eye_capturing: 'आँख की जांच हो रही है...',

    // BP screen
    bp_instruction: 'बाँह पर कफ लगाएं',
    bp_inflating: 'कफ फुला रहा है...',
    bp_measuring: 'माप रहा है...',
    bp_reading: 'पढ़ रहा है...',
    bp_manual: 'मैन्युअल नंबर दर्ज करें',

    // Height screen
    height_instruction: 'सीधे खड़े रहें',
    height_reading: 'ऊँचाई माप रहे हैं...',

    // Weight screen
    weight_instruction: 'अपना वज़न दर्ज करें (kg)',
    bmi_normal: 'सामान्य',
    bmi_underweight: 'कम वज़न',
    bmi_overweight: 'अधिक वज़न',
    bmi_obese: 'मोटापा',

    // PHQ-9
    phq9_title: 'मानसिक स्वास्थ्य प्रश्न',
    phq9_subtitle: 'पिछले 2 हफ्तों में कितने दिन?',
    not_at_all: 'बिल्कुल नहीं',
    several_days: 'कुछ दिन',
    more_than_half: 'आधे से ज़्यादा दिन',
    nearly_every_day: 'लगभग हर दिन',

    // AI Analysis
    ai_analyzing: 'आपकी सभी जानकारी का विश्लेषण हो रहा है...',
    ai_question: 'AI आपसे पूछ रहा है',

    // Results
    result_green: 'स्वस्थ',
    result_yellow: 'सावधानी',
    result_red: 'तुरंत ध्यान दें',
    what_to_do: 'आगे क्या करें',
    ayushman_eligible: 'आयुष्मान भारत: पात्र हैं ✓',
    printing: 'रसीद प्रिंट हो रही है...',

    // Thank you
    take_receipt: 'रसीद लें',
    thankyou: 'धन्यवाद',
    returning_in: 'वापस जा रहे हैं',

    // Connectivity
    offline_mode: 'ऑफलाइन मोड — स्थानीय AI सक्रिय',
    online_mode: 'ऑनलाइन — Groq AI सक्रिय',

    // Errors
    retry: 'दोबारा कोशिश करें',
    skip: 'छोड़ें',
    checkup_complete: 'आपकी जांच पूरी हो गई',
    collect_receipt: 'प्रिंटर से अपनी रसीद लें',
    go_back_now: 'अभी वापस जाएं',
    sensor_ready: 'सेंसर तैयार है',
    ocr_failed: 'OCR विफल — मैन्युअल नंबर दर्ज करें',
    temp_reading: 'तापमान माप रहे हैं...',
    height_reading_status: 'ऊँचाई माप रहे हैं...',
    next_btn: 'आगे बढ़ें',
    eye_normal: 'सामान्य',
    eye_cataract: 'मोतियाबिंद',
    eye_glaucoma: 'ग्लूकोमा',
    eye_diabetic: 'मधुमेह नेत्र रोग',
  },
  en: {
    namaste: 'Welcome 🙏',
    tagline: 'Your Health, Our Priority',
    daily_checkup: 'Daily Checkup',
    special_diagnosis: 'Special Diagnosis',
    daily_checkup_sub: '8 checks • 4 minutes',
    special_diagnosis_sub: 'Describe symptoms • AI diagnosis',
    select_language: 'Select Your Language',
    register_title: 'New Registration',
    name: 'Full Name',
    age: 'Age',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    village: 'Village Name',
    role: 'What are you?',
    farmer: 'Farmer',
    labour: 'Labour',
    homemaker: 'Homemaker',
    elderly: 'Elderly',
    student: 'Student',
    mobile: 'Mobile Number',
    submit: 'Submit',
    already_registered: 'Already registered?',
    login_title: 'Welcome Back',
    scan_qr: 'Scan QR',
    enter_mobile: 'Mobile Number',
    new_patient: 'New patient? Register',
    step_temperature: 'Temperature',
    step_heart: 'Heart Rate',
    step_ecg: 'ECG',
    step_eye: 'Eye Check',
    step_bp: 'Blood Pressure',
    step_height: 'Height',
    step_weight: 'Weight',
    step_mental: 'Mental Health',
    temp_instruction: 'Bring your wrist near the sensor',
    temp_reading: 'Reading temperature...',
    temp_done: 'Temperature recorded',
    hr_instruction: 'Insert finger into slot',
    hr_reading: 'Reading heart rate...',
    finger_not_detected: 'Finger not properly placed',
    ecg_instruction: 'Place both palms on the pads',
    ecg_recording: 'Recording ECG...',
    leads_disconnected: 'Keep hands on pads',
    eye_instruction: 'Bring eye close to hood',
    eye_capturing: 'Scanning eye...',
    bp_instruction: 'Place cuff on arm',
    bp_inflating: 'Inflating cuff...',
    bp_measuring: 'Measuring...',
    bp_reading: 'Reading...',
    bp_manual: 'Enter manually',
    height_instruction: 'Stand straight',
    height_reading: 'Reading height...',
    weight_instruction: 'Enter your weight (kg)',
    bmi_normal: 'Normal',
    bmi_underweight: 'Underweight',
    bmi_overweight: 'Overweight',
    bmi_obese: 'Obese',
    phq9_title: 'Mental Health Questions',
    phq9_subtitle: 'Over the last 2 weeks, how often?',
    not_at_all: 'Not at all',
    several_days: 'Several days',
    more_than_half: 'More than half the days',
    nearly_every_day: 'Nearly every day',
    ai_analyzing: 'Analyzing all your information...',
    ai_question: 'AI is asking you',
    result_green: 'Healthy',
    result_yellow: 'Caution',
    result_red: 'Seek Immediate Care',
    what_to_do: 'What to do next',
    ayushman_eligible: 'Ayushman Bharat: Eligible ✓',
    printing: 'Printing receipt...',
    take_receipt: 'Take your receipt',
    thankyou: 'Thank You',
    returning_in: 'Returning in',
    offline_mode: 'Offline Mode — Local AI Active',
    online_mode: 'Online — Groq AI Active',
    retry: 'Try Again',
    skip: 'Skip',
    checkup_complete: 'Your checkup is complete',
    collect_receipt: 'Collect your receipt from the printer',
    go_back_now: 'Go Back Now',
    sensor_ready: 'Sensor ready',
    ocr_failed: 'OCR failed — Enter manually',
    temp_reading: 'Reading temperature...',
    height_reading_status: 'Reading height...',
    next_btn: 'Continue',
    eye_normal: 'Normal',
    eye_cataract: 'Cataract',
    eye_glaucoma: 'Glaucoma',
    eye_diabetic: 'Diabetic Retinopathy',
  }
}

export const t = (key, language = 'hi') => {
  return translations[language]?.[key] || translations['hi'][key] || key
}

export default translations

// Auto-language t() — reads from localStorage so screens don't need to pass language
export const tAuto = (key) => {
  const language = localStorage.getItem('gramai_language') || 'en'
  return translations[language]?.[key] || translations['hi'][key] || key
}
