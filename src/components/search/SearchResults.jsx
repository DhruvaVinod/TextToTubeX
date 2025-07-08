import React, { useState, useEffect } from 'react';
import './SearchResults.css';
import { useNavigate } from 'react-router-dom';
import { saveSummaryToFirestore } from '../../services/firestoreServices';
import { useAuth } from '../../context/AuthContext';

const SearchResults = ({ searchQuery, onBack }) => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [showSummarySelection, setShowSummarySelection] = useState(false);
  const [showLanguageSelection, setShowLanguageSelection] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState(null);
  const [copyrightError, setCopyrightError] = useState(null); // New state for copyright errors
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [disclaimerLanguage, setDisclaimerLanguage] = useState('English');
  const [audioUrl, setAudioUrl] = useState(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [audioData, setAudioData] = useState(null); // Base64 audio data
  const [audioType, setAudioType] = useState(null); // Audio MIME type
  
  const languages = {
    "English": "en",
    "Hindi": "hi",
    "Tamil": "ta",
    "Telugu": "te",
    "Kannada": "kn",
    "Malayalam": "ml",
    "Bengali": "bn",
    "Gujarati": "gu",
    "Marathi": "mr",
    "Punjabi": "pa",
    "Urdu": "ur",
    "Odia": "or",
    "Assamese": "as"
  };

  const disclaimerTranslations = {
  English: {
    title: "How Our AI Summaries Work",
    aiPowered: {
      title: "AI-Powered Analysis",
      content: "Our system uses advanced Gemini AI to analyze video metadata including title, description, and tags to generate intelligent summaries."
    },
    metadataBased: {
      title: "Metadata-Based", 
      content: "Summaries are created from publicly available video information, not from processing the actual video content."
    },
    multiLanguage: {
      title: "Multi-Language Support",
      content: "AI generates summaries in your preferred language while maintaining accuracy and natural language flow."
    },
    note: "While our AI provides comprehensive educational summaries based on available information, we recommend watching the original video for complete understanding and context."
  },
  Hindi: {
    title: "हमारे AI सारांश कैसे काम करते हैं",
    aiPowered: {
      title: "AI-संचालित विश्लेषण",
      content: "हमारा सिस्टम उन्नत Gemini AI का उपयोग करके वीडियो मेटाडेटा जैसे शीर्षक, विवरण और टैग का विश्लेषण करके बुद्धिमान सारांश तैयार करता है।"
    },
    metadataBased: {
      title: "मेटाडेटा-आधारित",
      content: "सारांश सार्वजनिक रूप से उपलब्ध वीडियो जानकारी से बनाए जाते हैं, वास्तविक वीडियो सामग्री को प्रोसेस करने से नहीं।"
    },
    multiLanguage: {
      title: "बहु-भाषा समर्थन",
      content: "AI सटीकता और प्राकृतिक भाषा प्रवाह बनाए रखते हुए आपकी पसंदीदा भाषा में सारांश तैयार करता है।"
    },
    note: "जबकि हमारा AI उपलब्ध जानकारी के आधार पर व्यापक शैक्षिक सारांश प्रदान करता है, हम पूर्ण समझ और संदर्भ के लिए मूल वीडियो देखने की सलाह देते हैं।"
  },
  Tamil: {
    title: "எங்கள் AI சுருக்கங்கள் எவ்வாறு செயல்படுகின்றன",
    aiPowered: {
      title: "AI-இயங்கும் பகுப்பாய்வு",
      content: "எங்கள் அமைப்பு மேம்பட்ட Gemini AI ஐப் பயன்படுத்தி வீடியோ மெட்டாடேட்டா, தலைப்பு, விளக்கம் மற்றும் குறிச்சொற்களை பகுப்பாய்வு செய்து அறிவார்ந்த சுருக்கங்களை உருவாக்குகிறது."
    },
    metadataBased: {
      title: "மெட்டாடேட்டா-அடிப்படையிலான",
      content: "சுருக்கங்கள் பொதுவில் கிடைக்கும் வீடியோ தகவல்களிலிருந்து உருவாக்கப்படுகின்றன, உண்மையான வீடியோ உள்ளடக்கத்தை செயலாக்குவதிலிருந்து அல்ல."
    },
    multiLanguage: {
      title: "பல மொழி ஆதரவு",
      content: "AI துல்லியம் மற்றும் இயற்கையான மொழி ஓட்டத்தை பராமரித்து உங்கள் விருப்பமான மொழியில் சுருக்கங்களை உருவாக்குகிறது।"
    },
    note: "எங்கள் AI கிடைக்கும் தகவல்களின் அடிப்படையில் விரிவான கல்வி சுருக்கங்களை வழங்கினாலும், முழுமையான புரிதல் மற்றும் சூழலுக்காக அசல் வீடியோவைப் பார்க்க பரிந்துரைக்கிறோம்."
  },
  Telugu: {
    title: "మా AI సారాంశాలు ఎలా పని చేస్తాయి",
    aiPowered: {
      title: "AI-శక్తితో నడిచే విశ్లేషణ",
      content: "మా వ్యవస్థ అధునాతన Gemini AI ను ఉపయోగించి వీడియో మెటాడేటా, టైటిల్, వివరణ మరియు ట్యాగ్లను విశ్లేషించి తెలివైన సారాంశాలను రూపొందిస్తుంది."
    },
    metadataBased: {
      title: "మెటాడేటా-ఆధారిత",
      content: "సారాంశాలు పబ్లిక్‌గా అందుబాటులో ఉన్న వీడియో సమాచారం నుండి రూపొందించబడతాయి, వాస్తవ వీడియో కంటెంట్‌ను ప్రాసెస్ చేయడం నుండి కాదు."
    },
    multiLanguage: {
      title: "బహుళ భాషా మద్దతు",
      content: "AI ఖచ్చితత్వం మరియు సహజ భాషా ప్రవాహాన్ని కొనసాగిస్తూ మీ ఇష్టపడే భాషలో సారాంశాలను రూపొందిస్తుంది."
    },
    note: "మా AI అందుబాటులో ఉన్న సమాచారం ఆధారంగా సమగ్ర విద్యా సారాంశాలను అందిస్తున్నప్పటికీ, పూర్తి అవగాహన మరియు సందర్భం కోసం అసలు వీడియోను చూడాలని మేము సిఫార్సు చేస్తున్నాము."
  },
  Bengali: {
    title: "আমাদের AI সারাংশ কীভাবে কাজ করে",
    aiPowered: {
      title: "AI-চালিত বিশ্লেষণ",
      content: "আমাদের সিস্টেম উন্নত Gemini AI ব্যবহার করে ভিডিও মেটাডেটা, শিরোনাম, বিবরণ এবং ট্যাগ বিশ্লেষণ করে বুদ্ধিমান সারাংশ তৈরি করে।"
    },
    metadataBased: {
      title: "মেটাডেটা-ভিত্তিক",
      content: "সারাংশগুলি সর্বজনীনভাবে উপলব্ধ ভিডিও তথ্য থেকে তৈরি করা হয়, প্রকৃত ভিডিও বিষয়বস্তু প্রক্রিয়াকরণ থেকে নয়।"
    },
    multiLanguage: {
      title: "বহুভাষিক সহায়তা",
      content: "AI নির্ভুলতা এবং প্রাকৃতিক ভাষার প্রবাহ বজায় রেখে আপনার পছন্দের ভাষায় সারাংশ তৈরি করে।"
    },
    note: "যদিও আমাদের AI উপলব্ধ তথ্যের উপর ভিত্তি করে ব্যাপক শিক্ষামূলক সারাংশ প্রদান করে, আমরা সম্পূর্ণ বোঝাপড়া এবং প্রসঙ্গের জন্য মূল ভিডিও দেখার পরামর্শ দিই।"
  },
  Kannada: {
  title: "ನಮ್ಮ AI ಸಾರಾಂಶಗಳು ಹೇಗೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತವೆ",
  aiPowered: {
    title: "AI ಚಾಲಿತ ವಿಶ್ಲೇಷಣೆ",
    content: "ನಮ್ಮ ವ್ಯವಸ್ಥೆ ಶೀರ್ಷಿಕೆ, ವಿವರಣೆ ಮತ್ತು ಟ್ಯಾಗ್‌ಗಳನ್ನು ಒಳಗೊಂಡ ವಿಡಿಯೋ ಮೆಟಾಡೇಟಾವನ್ನು ವಿಶ್ಲೇಷಿಸಲು ಅಭಿವೃದ್ಧಿತ Gemini AI ಅನ್ನು ಬಳಸುತ್ತದೆ."
  },
  metadataBased: {
    title: "ಮೆಟಾಡೇಟಾ ಆಧಾರಿತ",
    content: "ಸಾರಾಂಶಗಳನ್ನು ಸಾರ್ವಜನಿಕವಾಗಿ ಲಭ್ಯವಿರುವ ವಿಡಿಯೋ ಮಾಹಿತಿಯಿಂದ ರಚಿಸಲಾಗಿದೆ, ವಾಸ್ತವಿಕ ವಿಡಿಯೋ ವಿಷಯವನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸುವುದರಿಂದ ಅಲ್ಲ."
  },
  multiLanguage: {
    title: "ಬಹು ಭಾಷಾ ಬೆಂಬಲ",
    content: "AI ನಿಮ್ಮ ಇಚ್ಛಿತ ಭಾಷೆಯಲ್ಲಿ ಸಾರಾಂಶಗಳನ್ನು ನೀಡುತ್ತದೆ ಮತ್ತು ನೈಸರ್ಗಿಕ ಭಾಷಾ ಹರಿವನ್ನು ಕಾಯ್ದಿರುತ್ತದೆ."
  },
  note: "ಪೂರ್ಣ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಮತ್ತು ಸಂದರ್ಭಕ್ಕಾಗಿ ಮೂಲ ವಿಡಿಯೋವನ್ನು ವೀಕ್ಷಿಸುವಂತೆ ಶಿಫಾರಸು ಮಾಡುತ್ತೇವೆ."
},
Malayalam: {
  title: "നമ്മുടെ AI സംഗ്രഹങ്ങൾ എങ്ങനെ പ്രവർത്തിക്കുന്നു",
  aiPowered: {
    title: "AI-ഓടൊപ്പമുള്ള വിശകലനം",
    content: "Gemini AI ഉപയോഗിച്ച് ഞങ്ങൾ വീഡിയോയുടെ തലക്കെട്ട്, വിവരണം, ടാഗുകൾ എന്നിവ വിശകലനം ചെയ്ത് ബുദ്ധിമുട്ടുള്ള സംഗ്രഹങ്ങൾ സൃഷ്ടിക്കുന്നു."
  },
  metadataBased: {
    title: "മെറ്റാഡേറ്റാ അടിസ്ഥാനമാക്കി",
    content: "സംഗ്രഹങ്ങൾ പൊതുവെ ലഭ്യമായ വീഡിയോ വിവരങ്ങളിൽ നിന്നാണ് സൃഷ്ടിക്കുന്നത്, യഥാർത്ഥ വീഡിയോയിലല്ല."
  },
  multiLanguage: {
    title: "നാനാഭാഷാ പിന്തുണ",
    content: "AI നിങ്ങളുടെ ഇഷ്ട ഭാഷയിൽ സംഗ്രഹങ്ങൾ നൽകുന്നു, കൃത്യതയും നൈസർഗികമായ ഭാഷാ പ്രവാഹവും നിലനിർത്തുന്നു."
  },
  note: "പൂർണ്ണമായ മനസ്സിലാക്കലിന് വീഡിയോ തന്നെ കാണാനാണ് ഞങ്ങളുടെ ശുപാർശ."
},
Gujarati: {
  title: "અમારા AI સારાંશ કેવી રીતે કામ કરે છે",
  aiPowered: {
    title: "AI દ્વારા સંચાલિત વિશ્લેષણ",
    content: "વિડિયો શીર્ષક, વર્ણન અને ટૅગ્સ જેવા મેટાડેટાને વિશ્લેષણ કરવા માટે અમારું સિસ્ટમ એડવાન્સડ Gemini AI નો ઉપયોગ કરે છે."
  },
  metadataBased: {
    title: "મેટાડેટા આધારિત",
    content: "સારાંશો જાહેરમાં ઉપલબ્ધ વિડિયો માહિતી પરથી બનાવવામાં આવે છે, મૂળ વિડિયો જોઈને નહીં."
  },
  multiLanguage: {
    title: "બહુભાષીય આધાર",
    content: "AI ચોકસાઈ અને પ્રાકૃતિક ભાષા પ્રવાહ જાળવીને પસંદ કરેલી ભાષામાં સારાંશ બનાવે છે."
  },
  note: "મૂળ વિડિયો જોઈને સંપૂર્ણ સમજ માટે અમારી ભલામણ છે."
},
Marathi: {
  title: "आमचे AI सारांश कसे कार्य करतात",
  aiPowered: {
    title: "AI-आधारित विश्लेषण",
    content: "आमची प्रणाली Gemini AI वापरते जे व्हिडिओ शीर्षक, वर्णन आणि टॅगचे विश्लेषण करते."
  },
  metadataBased: {
    title: "मेटाडेटा-आधारित",
    content: "सारांश सार्वजनिक माहितीवर आधारित असतात, प्रत्यक्ष व्हिडिओवर नाही."
  },
  multiLanguage: {
    title: "अनेक भाषांचे समर्थन",
    content: "AI तुमच्या पसंतीच्या भाषेत अचूक आणि नैसर्गिक भाषेतील सारांश तयार करते."
  },
  note: "संपूर्ण समज आणि संदर्भासाठी मूळ व्हिडिओ पाहण्याची शिफारस आम्ही करतो."
},
Punjabi: {
  title: "ਸਾਡੀਆਂ AI ਸੰਖੇਪ ਜਾਣਕਾਰੀਆਂ ਕਿਵੇਂ ਕੰਮ ਕਰਦੀਆਂ ਹਨ",
  aiPowered: {
    title: "AI-ਚਲਿਤ ਵਿਸ਼ਲੇਸ਼ਣ",
    content: "ਸਾਡੀ ਪ੍ਰਣਾਲੀ Gemini AI ਦੀ ਵਰਤੋਂ ਕਰਦੀ ਹੈ ਜੋ ਵੀਡੀਓ ਦੇ ਮੈਟਾਡੇਟਾ (ਟਾਈਟਲ, ਵੇਰਵਾ, ਟੈਗ) ਦਾ ਵਿਸ਼ਲੇਸ਼ਣ ਕਰਦੀ ਹੈ।"
  },
  metadataBased: {
    title: "ਮੈਟਾਡੇਟਾ-ਅਧਾਰਤ",
    content: "ਸੰਖੇਪ ਜਾਣਕਾਰੀਆਂ ਪਬਲਿਕ ਜਾਣਕਾਰੀ ਉੱਤੇ ਆਧਾਰਿਤ ਹੁੰਦੀਆਂ ਹਨ, ਨਾ ਕਿ ਅਸਲ ਵੀਡੀਓ ਤੇ।"
  },
  multiLanguage: {
    title: "ਮਲਟੀ-ਲੈਂਗਵਿਜ ਸਹਿਯੋਗ",
    content: "AI ਤੁਹਾਡੀ ਪਸੰਦ ਦੀ ਭਾਸ਼ਾ ਵਿੱਚ ਸੰਖੇਪ ਜਾਣਕਾਰੀਆਂ ਪ੍ਰਦਾਨ ਕਰਦੀ ਹੈ।"
  },
  note: "ਪੂਰੀ ਸਮਝ ਅਤੇ ਸੰਦਰਭ ਲਈ ਅਸਲ ਵੀਡੀਓ ਦੇਖਣ ਦੀ ਸਿਫ਼ਾਰਸ਼ ਕੀਤੀ ਜਾਂਦੀ ਹੈ।"
},
Urdu: {
  title: "ہمارے AI خلاصے کیسے کام کرتے ہیں",
  aiPowered: {
    title: "AI سے تقویت یافتہ تجزیہ",
    content: "ہماری نظام Gemini AI کا استعمال کرتا ہے تاکہ ویڈیو کے عنوان، وضاحت، اور ٹیگز کا تجزیہ کر کے ذہین خلاصے تیار کیے جا سکیں۔"
  },
  metadataBased: {
    title: "میٹاڈیٹا پر مبنی",
    content: "خلاصے صرف عوامی معلومات پر مبنی ہوتے ہیں، ویڈیو کے اصل مواد پر نہیں۔"
  },
  multiLanguage: {
    title: "کثیر لسانی معاونت",
    content: "AI آپ کی پسندیدہ زبان میں درست اور قدرتی انداز میں خلاصے بناتا ہے۔"
  },
  note: "ہم مکمل فہم کے لیے اصل ویڈیو دیکھنے کی تجویز دیتے ہیں۔"
},
Odia: {
  title: "ଆମର AI ସାରାଂଶ କିପରି କାମ କରେ",
  aiPowered: {
    title: "AI ଚାଳିତ ବିଶ୍ଲେଷଣ",
    content: "Gemini AI ବ୍ୟବହାର କରି ଆମ ପ୍ରଣାଳୀ ଟାଇଟଲ, ବିବରଣୀ ଓ ଟ୍ୟାଗ ବିଶ୍ଲେଷଣ କରି ସାରାଂଶ ସୃଷ୍ଟି କରେ।"
  },
  metadataBased: {
    title: "ମେଟାଡେଟା ଆଧାରିତ",
    content: "ସାରାଂଶ ସାଧାରଣ ଭାବରେ ଉପଲବ୍ଧ ଥିବା ଭିଡିଓ ସୂଚନା ଉପରେ ଆଧାରିତ ଅଟେ।"
  },
  multiLanguage: {
    title: "ବହୁ ଭାଷା ସମର୍ଥନ",
    content: "AI ନିଜର ସଠିକତା ଓ ସ୍ୱାଭାବିକ ଭାଷା ପ୍ରବାହକୁ ରକ୍ଷା କରି ଆପଣଙ୍କ ଭାଷାରେ ସାରାଂଶ ଦେଉଛି।"
  },
  note: "ସଂପୂର୍ଣ୍ଣ ବୁଝିବା ପାଇଁ ଆମେ ମୂଳ ଭିଡିଓ ଦେଖିବା ପରାମର୍ଶ ଦେଉଛୁ।"
},
Assamese: {
  title: "আমাৰ AI চমু-সাৰাংশ কেনেকৈ কাম কৰে",
  aiPowered: {
    title: "AI-চালিত বিশ্লেষণ",
    content: "আমাৰ প্ৰণালীয়ে Gemini AI ব্যৱহাৰ কৰি ভিডিঅ'ৰ শিৰোনাম, বিৱৰণ আৰু টেগ বিশ্লেষণ কৰি বুদ্ধিমান চমু-সাৰাংশ প্রস্তুত কৰে।"
  },
  metadataBased: {
    title: "মেটাডেটা-ভিত্তিক",
    content: "চমু-সাৰাংশবোৰ সাধাৰণতে উপলব্ধ ভিডিঅ' তথ্যৰ পৰা নিৰ্মাণ কৰা হয়, ভিডিঅ'ৰ আসল সামগ্ৰী প্ৰসেস নকৰাকৈ।"
  },
  multiLanguage: {
    title: "বহুভাষিক সহায়তা",
    content: "AI সঠিকতা আৰু প্ৰাকৃতিক ভাষা প্ৰৱাহ ৰক্ষা কৰি আপোনাৰ পছন্দৰ ভাষাত চমু-সাৰাংশ প্ৰদান কৰে।"
  },
  note: "সম্পূৰ্ণ বুজাবুজিৰ বাবে মূল ভিডিঅ'টো চাবলৈ পৰামৰ্শ দিয়া হৈছে।"
}

};

  const funFacts = [
    "Did you know? Google processes over 8.5 billion searches every single day!",
    "Fun fact: Google's original name was 'BackRub' before Larry Page and Sergey Brin changed it to Google.",
    "Amazing! Google Translate supports over 130 languages and translates more than 100 billion words daily.",
    "Cool fact: Gmail was announced on April 1, 2004, and many people thought it was an April Fools' joke!",
    "Interesting: Google's headquarters is called the Googleplex, located in Mountain View, California.",
    "Did you know? YouTube uploads over 500 hours of video content every minute!",
    "Fun fact: Google Chrome is the world's most popular web browser, used by over 3 billion people.",
    "Amazing! Google Drive stores over 2 trillion files and has more than 1 billion users worldwide.",
    "Cool fact: Google Maps has mapped over 220 countries and territories, including Street View imagery.",
    "Interesting: Google's search algorithm uses more than 200 factors to rank web pages in search results.",
    "Did you know? Google Docs, Sheets, and Slides allow real-time collaboration with unlimited revision history.",
    "Fun fact: Google's PageRank algorithm was named after Larry Page, one of Google's co-founders.",
    "Amazing! Google Photos stores over 4 trillion photos and offers 15GB of free storage per account.",
    "Cool fact: Google Scholar indexes over 160 million academic documents and research papers.",
    "Interesting: Google Classroom is used by over 150 million students and teachers worldwide.",
    "Did you know? Google's 'I'm Feeling Lucky' button bypasses search results and takes you directly to the first result.",
    "Fun fact: Google Earth has captured imagery of over 98% of the world's population areas.",
    "Amazing! Google Assistant can understand and respond in over 30 languages across 90+ countries.",
    "Cool fact: Google Lens can identify over 1 billion objects, including plants, animals, and landmarks.",
    "Interesting: Google's data centers use 50% less energy than typical data centers through innovative cooling systems.",
    "Did you know? Google Search can perform calculations, unit conversions, and even solve math equations directly.",
    "Fun fact: Google Keep lets you search for notes by drawing or sketching what you're looking for.",
    "Amazing! Google Meet can host video calls with up to 500 participants in enterprise accounts.",
    "Cool fact: Google Trends shows what the world is searching for in real-time and historical data.",
    "Interesting: Google's autocomplete feature processes search queries in less than 0.2 seconds.",
    "Did you know? Google Play Store has over 2.8 million apps available for Android devices.",
    "Fun fact: Google's logo has been changed over 5,000 times with special Doodles since 1998.",
    "Amazing! Google Forms can automatically grade quizzes and provides instant feedback to students.",
    "Cool fact: Google Sites allows you to create websites without any coding knowledge required.",
    "Interesting: Google's mission statement is 'to organize the world's information and make it universally accessible and useful.'"
  ];

  const fetchAudioUrl = async (text, languageCode) => {
  try {
    const response = await fetch('http://localhost:5000/api/generate-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language_code: languageCode })
    });

    if (!response.ok) throw new Error('Failed to fetch audio');

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Convert blob to base64 for storage
    const audioBase64 = await blobToBase64(audioBlob);
    
    return {
      url: audioUrl,
      data: audioBase64,
      type: audioBlob.type
    };
  } catch (error) {
    console.error('Audio generation error:', error);
    return null;
  }
};

const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const base64ToUrl = (base64Data) => {
  try {
    const response = fetch(base64Data);
    return response.then(res => res.blob()).then(blob => URL.createObjectURL(blob));
  } catch (error) {
    console.error('Error converting base64 to URL:', error);
    return null;
  }
};

const handleGenerateAudio = async () => {
  if (!summaryData?.summary) {
    setAudioError('No summary available to convert to audio');
    return;
  }

  try {
    setIsGeneratingAudio(true);
    setAudioError(null);
    
    const audioResult = await fetchAudioUrl(
      summaryData.summary,  
      selectedLanguage       
    );
    
    if (audioResult) {
      setAudioUrl(audioResult.url);
      setAudioData(audioResult.data); // Store the base64 data
      setAudioType(audioResult.type);
    } else {
      setAudioError('Failed to generate audio. Please try again.');
    }
  } catch (error) {
    console.error('Audio generation error:', error);
    setAudioError('Failed to generate audio. Please try again.');
  } finally {
    setIsGeneratingAudio(false);
  }
};

  // Function to search YouTube videos
  const searchYouTubeVideos = async (query) => {
    try {
      const response = await fetch('http://localhost:5000/api/search-videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error('Failed to search videos');
      }

      const data = await response.json();
      return data.videos;
    } catch (error) {
      console.error('Error searching videos:', error);
      throw error;
    }
  };

  // Function to generate summary
  const generateSummary = async (videoId, language) => {
    try {
      const response = await fetch('http://localhost:5000/api/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          video_id: videoId,
          language: language
        }),
      });

      // Handle copyright error specifically
      if (response.status === 403) {
        const errorData = await response.json();
        if (errorData.copyright_restricted) {
          throw new Error(`COPYRIGHT_ERROR:${errorData.error}`);
        }
      }

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  };

  // Function to format duration from YouTube API format
  const formatDuration = (duration) => {
    // YouTube API returns duration in ISO 8601 format (PT4M13S)
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    
    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');
    
    let formattedDuration = '';
    
    if (hours) {
      formattedDuration += `${hours}:`;
    }
    
    if (minutes) {
      formattedDuration += hours ? minutes.padStart(2, '0') : minutes;
    } else {
      formattedDuration += '0';
    }
    
    formattedDuration += ':';
    formattedDuration += seconds ? seconds.padStart(2, '0') : '00';
    
    return formattedDuration;
  };

  // Function to format view count
  const formatViews = (viewCount) => {
    const count = parseInt(viewCount);
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    } else {
      return `${count} views`;
    }
  };

  useEffect(() => {
    const factInterval = setInterval(() => {
      setCurrentFactIndex(() => Math.floor(Math.random() * funFacts.length));
    }, 4000);

    // Search for videos when component mounts
    const loadVideos = async () => {
      try {
        setIsLoading(true);
        const searchResults = await searchYouTubeVideos(searchQuery);
        
        // Transform the results to match our component structure
        const transformedVideos = searchResults.map((video, index) => ({
          id: video.id,
          title: video.title,
          channel: video.channelTitle,
          duration: formatDuration(video.duration),
          views: formatViews(video.viewCount),
          thumbnail: video.thumbnailUrl,
          description: video.description,
          publishedAt: video.publishedAt,
          relevanceScore: video.relevanceScore,
          videoUrl: `https://www.youtube.com/watch?v=${video.id}`
        }));

        setVideos(transformedVideos);
        setIsLoading(false);
        setShowResults(true);
      } catch (error) {
        console.error('Error loading videos:', error);
        setError('Failed to load videos. Please try again.');
        setIsLoading(false);
      }
    };

    loadVideos();

    return () => {
      clearInterval(factInterval);
    };
  }, [searchQuery]);

  useEffect(() => {
    if (isGeneratingSummary) {
      const factInterval = setInterval(() => {
        setCurrentFactIndex(() => Math.floor(Math.random() * funFacts.length));
      }, 4000);

      const processSummary = async () => {
        try {
          const summaryResult = await generateSummary(selectedVideo.id, selectedLanguage);
          setSummaryData(summaryResult);
          setIsGeneratingSummary(false);
          setShowSummary(true);
        } catch (error) {
          console.error('Error processing summary:', error);
          
          // Check if it's a copyright error
          if (error.message.startsWith('COPYRIGHT_ERROR:')) {
            const copyrightMessage = error.message.replace('COPYRIGHT_ERROR:', '');
            setCopyrightError({
              message: copyrightMessage,
              video: selectedVideo
            });
          } else {
            setError('Failed to generate summary. Please try again.');
          }
          
          setIsGeneratingSummary(false);
        }
      };

      processSummary();

      return () => {
        clearInterval(factInterval);
      };
    }
  }, [isGeneratingSummary, selectedVideo, selectedLanguage]);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Reset audio when video or language changes
  useEffect(() => {
    setAudioUrl(null);
    setAudioData(null);
    setAudioType(null);
    setAudioError(null);
  }, [selectedVideo, selectedLanguage]);

  const handleGenerateSummary = () => {
    setShowSummarySelection(true);
  };

  const handleVideoSelect = (video) => {
    setSelectedVideo(video);
    setShowSummarySelection(false);
    setShowLanguageSelection(true);
  };

  const handleLanguageSelect = (languageCode, languageName) => {
    setSelectedLanguage(languageCode);
    setDisclaimerLanguage(languageName);
    setShowLanguageSelection(false);
    setIsGeneratingSummary(true);
  };

  const handleBackToSelection = () => {
    setShowSummary(false);
    setShowLanguageSelection(false);
    setShowSummarySelection(false);
    setSelectedVideo(null);
    setSelectedLanguage(null);
    setSummaryData(null);
    setCopyrightError(null); // Clear copyright error
  };

  const handleChangeVideo = () => {
    setShowSummary(false);
    setShowLanguageSelection(false);
    setShowSummarySelection(true);
    setSelectedVideo(null);
    setSelectedLanguage(null);
    setSummaryData(null);
    setCopyrightError(null); // Clear copyright error
  };

  const handleReadyForQuiz = () => {
    navigate('/quiz', { state: { quizTopic: searchQuery } });
  };

  const handleVideoClick = (video) => {
    // Open YouTube video in new tab
    window.open(video.videoUrl, '_blank');
  };

  const handleSaveSummary = async () => {
  // Check authentication using AuthContext instead of localStorage
  if (!isAuthenticated || !currentUser || !summaryData || !selectedVideo) {
    alert('Please make sure you are logged in and have a summary to save.');
    return;
  }

  try {
    setIsSaving(true);
    
    const summaryToSave = {
      // Remove the manual ID - Firestore will generate one
      userId: currentUser.uid, // Use Firebase user ID
      videoId: selectedVideo.id,
      videoTitle: selectedVideo.title,
      videoChannel: selectedVideo.channel,
      videoDuration: selectedVideo.duration,
      videoThumbnail: selectedVideo.thumbnail,
      videoUrl: selectedVideo.videoUrl,
      language: selectedLanguage,
      languageName: Object.keys(languages).find(key => languages[key] === selectedLanguage),
      content: summaryData.summary,
      keyPoints: summaryData.key_points || [],
      createdAt: new Date().toISOString(),
      searchQuery: searchQuery,
      // Save audio data instead of temporary URL
      audioData: audioData, // Base64 encoded audio
      audioType: audioType, // MIME type for proper playback
      hasAudio: !!audioData  // Flag to indicate if audio is available
    };

    // Save to Firestore instead of localStorage
    const savedSummary = await saveSummaryToFirestore(currentUser.uid, summaryToSave);
    
    console.log('Summary saved to Firestore:', savedSummary);
    
    setIsSaved(true);
    alert('Summary saved successfully!');
  } catch (error) {
    console.error('Error saving summary:', error);
    alert('Failed to save summary. Please try again.');
  } finally {
    setIsSaving(false);
  }
};

const loadSavedAudio = async (savedSummary) => {
  if (savedSummary.audioData) {
    try {
      const audioUrl = await base64ToUrl(savedSummary.audioData);
      return audioUrl;
    } catch (error) {
      console.error('Error loading saved audio:', error);
      return null;
    }
  }
  return null;
};

  const handleDownloadSummary = () => {
    if (summaryData && summaryData.summary) {
      const element = document.createElement('a');
      const file = new Blob([summaryData.summary], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `${selectedVideo.title.substring(0, 50)}_summary.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  // Handle back from copyright error
  const handleBackFromCopyright = () => {
    setCopyrightError(null);
    setShowSummarySelection(true);
  };

  // Copyright Error UI
  if (copyrightError) {
    return (
      <div className="search-results">
        <div className="loading-container">
          <div className="loading-header">
            <button className="back-btn" onClick={handleBackFromCopyright}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h2>Copyright Protected Content</h2>
          </div>
          
          <div className="loading-content">
            <div className="copyright-error-container">
              <div className="copyright-icon">🔒</div>
              <div className="copyright-video-info">
                <img 
                  src={copyrightError.video.thumbnail} 
                  alt={copyrightError.video.title}
                  className="copyright-thumbnail"
                />
                <div className="copyright-video-details">
                  <h3>{copyrightError.video.title}</h3>
                  <p>{copyrightError.video.channel}</p>
                </div>
              </div>
              
              <div className="copyright-message">
                <h4>Cannot Process This Video</h4>
                <p>{copyrightError.message}</p>
              </div>
              
              <div className="copyright-suggestions">
                <div className="suggestion">
                  <div className="suggestion-icon">🎓</div>
                  <div className="suggestion-text">
                    <strong>Try Educational Content</strong>
                    <p>Look for lectures, tutorials, or educational channels</p>
                  </div>
                </div>
                <div className="suggestion">
                  <div className="suggestion-icon">👤</div>
                  <div className="suggestion-text">
                    <strong>Independent Creators</strong>
                    <p>Choose videos from individual content creators</p>
                  </div>
                </div>
                <div className="suggestion">
                  <div className="suggestion-icon">🆓</div>
                  <div className="suggestion-text">
                    <strong>Open Source Content</strong>
                    <p>Look for Creative Commons or openly licensed videos</p>
                  </div>
                </div>
              </div>
              
              <div className="copyright-actions">
                <button className="change-video-btn" onClick={handleBackFromCopyright}>
                  Choose Different Video
                </button>
                <button className="watch-original-btn" onClick={() => window.open(copyrightError.video.videoUrl, '_blank')}>
                  Watch on YouTube
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="search-results">
        <div className="loading-container">
          <div className="loading-header">
            <button className="back-btn" onClick={onBack}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h2>Error occurred</h2>
          </div>
          
          <div className="loading-content">
            <div className="fun-fact">
              <div className="fact-icon">❌</div>
              <p className="fact-text">{error}</p>
            </div>
            <button className="change-video-btn" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="search-results">
        <div className="loading-container">
          <div className="loading-header">
            <button className="back-btn" onClick={onBack}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h2>Searching for: "{searchQuery}"</h2>
          </div>
          
          <div className="loading-content">
            <div className="loading-animation">
              <div className="pulse-ring"></div>
              <div className="pulse-ring delay-1"></div>
              <div className="pulse-ring delay-2"></div>
              <div className="search-icon">🔍</div>
            </div>
            
            <h3>Finding the best educational content for you...</h3>
            
            <div className="fun-fact">
              <div className="fact-icon">💡</div>
              <p className="fact-text">{funFacts[currentFactIndex]}</p>
            </div>
            
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isGeneratingSummary) {
    return (
      <div className="search-results">
        <div className="loading-container">
          <div className="loading-header">
            <button className="back-btn" onClick={handleBackToSelection}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h2>Generating summary for: "{selectedVideo?.title}"</h2>
          </div>
          
          <div className="loading-content">
            <div className="loading-animation">
              <div className="pulse-ring"></div>
              <div className="pulse-ring delay-1"></div>
              <div className="pulse-ring delay-2"></div>
              <div className="search-icon">📄</div>
            </div>
            
            <h3>Generating and translating AI summary...</h3>
            
            <div className="fun-fact">
              <div className="fact-icon">💡</div>
              <p className="fact-text">{funFacts[currentFactIndex]}</p>
            </div>
            
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showLanguageSelection) {
  return (
    <div className="search-results">
      <div className="results-header">
        <button className="back-btn" onClick={handleBackToSelection}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h2>Choose Language for Summary</h2>
      </div>
       
      <div className="results-content" style={{ padding: '20px', paddingTop: '0px' }}>
        <div className="selected-video-info" style={{ marginTop: '25px', marginBottom: '20px' }}>
            <div className="video-thumbnail">
              <img 
                src={selectedVideo.thumbnail}
                alt={selectedVideo.title}
                className="thumbnail-image"
              />
            </div>
            <div className="video-details">
              <h3>{selectedVideo.title}</h3>
              <p>{selectedVideo.channel}</p>
            </div>
        </div>
         
        <div style={{ maxWidth: '300px', margin: '0 auto' }}>
          <label htmlFor="language-select" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Select Language:
          </label>
          <select
            id="language-select"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '2px solid #ddd',
              fontSize: '16px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
            onChange={(e) => {
              const selectedOption = e.target.options[e.target.selectedIndex];
              const languageCode = selectedOption.value;
              const languageName = selectedOption.text;
              if (languageCode) {
                handleLanguageSelect(languageCode, languageName);
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>Choose a language...</option>
            {Object.entries(languages).map(([languageName, languageCode]) => (
              <option key={languageCode} value={languageCode}>
                {languageName}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
   
  if (showSummarySelection) {
    return (
      <div className="search-results">
        <div className="results-header">
          <button className="back-btn" onClick={handleBackToSelection}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h2>Create summary for which video?</h2>
        </div>
         
        <div className="results-content">
          <div className="video-grid">
            {videos.map((video) => (
              <div key={video.id} className="video-card" onClick={() => handleVideoSelect(video)}>
                <div className="video-thumbnail">
                  <img 
                    src={video.thumbnail}
                    alt={video.title}
                    className="thumbnail-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="thumbnail-icon" >🎥</div>
                  <div className="video-duration">{video.duration}</div>
                </div>
                <div className="video-info">
                  <h3 className="video-title">{video.title}</h3>
                  <p className="video-channel">{video.channel}</p>
                  <p className="video-views">{video.views}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (showSummary) {
    return (
      <div className="search-results">
        <div className="results-header">
          <button className="back-btn" onClick={handleBackToSelection}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h2>Summary for: "{selectedVideo?.title}"</h2>
          <button className="download-btn" onClick={handleDownloadSummary}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V15M7 10L12 15L17 10M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="results-content">
          <div className="summary-container">
            <div className="ai-disclaimer">
  <div 
    className="disclaimer-header clickable" 
    onClick={() => setDisclaimerOpen(!disclaimerOpen)}
  >
    <span className="disclaimer-icon">ℹ️</span>
    <h4>{disclaimerTranslations[disclaimerLanguage].title}</h4>
    <div className="disclaimer-controls">
      <span className={`dropdown-arrow ${disclaimerOpen ? 'open' : ''}`}>▼</span>
    </div>
  </div>
  
  {disclaimerOpen && (
    <div className="disclaimer-content">
      <div className="disclaimer-grid">
        <div className="disclaimer-item">
          <span className="item-icon">🧠</span>
          <div className="item-content">
            <strong>{disclaimerTranslations[disclaimerLanguage].aiPowered.title}</strong>
            <p>{disclaimerTranslations[disclaimerLanguage].aiPowered.content}</p>
          </div>
        </div>
        
        <div className="disclaimer-item">
          <span className="item-icon">📄</span>
          <div className="item-content">
            <strong>{disclaimerTranslations[disclaimerLanguage].metadataBased.title}</strong>
            <p>{disclaimerTranslations[disclaimerLanguage].metadataBased.content}</p>
          </div>
        </div>
        
        <div className="disclaimer-item">
          <span className="item-icon">🌐</span>
          <div className="item-content">
            <strong>{disclaimerTranslations[disclaimerLanguage].multiLanguage.title}</strong>
            <p>{disclaimerTranslations[disclaimerLanguage].multiLanguage.content}</p>
          </div>
        </div>
      </div>
      
      <div className="disclaimer-note">
        <p><strong>Note:</strong> {disclaimerTranslations[disclaimerLanguage].note}</p>
      </div>
    </div>
  )}
</div>
<div className="audio-section">
  {!audioUrl && !isGeneratingAudio && (
    <button 
      className="generate-audio-btn" 
      onClick={handleGenerateAudio}
      disabled={!summaryData?.summary}
    >
      🔊 
    </button>
  )}
  
  {isGeneratingAudio && (
    <div className="audio-loading">
      <div className="loading-spinner"></div>
      <span>.........</span>
    </div>
  )}
  
  {audioError && (
    <div className="audio-error">
      <span className="error-icon">⚠️</span>
      <span>{audioError}</span>
      <button onClick={handleGenerateAudio} className="retry-btn">Try Again</button>
    </div>
  )}
  
  {audioUrl && (
    <div className="audio-player-container">
      <h4>🎧 Listen to Summary</h4>
      <audio controls src={audioUrl} className="audio-player">
        Your browser does not support the audio element.
      </audio>
      <button 
        className="regenerate-audio-btn" 
        onClick={handleGenerateAudio}
        disabled={isGeneratingAudio}
      >
        🔄 Regenerate Audio
      </button>
    </div>
  )}
</div>


            <div className="summary-content">
              {summaryData ? (
                <div>
                  <div className="summary-info">
                    <p><strong>Language:</strong> {Object.keys(languages).find(key => languages[key] === selectedLanguage)}</p>
                    <p><strong>Video Duration:</strong> {selectedVideo.duration}</p>
                    <p><strong>Channel:</strong> {selectedVideo.channel}</p>
                  </div>
                  <div className="summary-text">
                    <h4>Summary:</h4>
                    <p>{summaryData.summary}</p>
                  </div>
                  {summaryData.key_points && (
                    <div className="key-points">
                      <h4>Key Points:</h4>
                      <ul>
                        {summaryData.key_points.map((point, index) => (
                          <li key={index}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p>Loading summary...</p>
              )}
            </div>
            
            <div className="summary-actions">
              <button className="change-video-btn" onClick={handleChangeVideo}>
                Change Video
              </button>
              <button 
                className={`save-btn ${isSaved ? 'saved' : ''}`}
                onClick={handleSaveSummary}
                disabled={isSaving || isSaved}
              >
                {isSaving ? 'Saving...' : isSaved ? 'Saved ✓' : 'Save Summary'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="search-results">
      <div className="results-header">
        <button className="back-btn" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h2>Results for: "{searchQuery}"</h2>
      </div>

      <div className="results-content">
        <div className="video-grid">
          {videos.map((video) => (
            <div key={video.id} className="video-card" onClick={() => handleVideoClick(video)}>
              <div className="video-thumbnail">
                <img 
                  src={video.thumbnail} 
                  alt={video.title}
                  className="thumbnail-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="thumbnail-icon" style={{ display: 'box' }}>🎥</div>
                <div className="video-duration">{video.duration}</div>
                {video.relevanceScore && (
                  <div className="relevance-score">
                    {Math.round(video.relevanceScore * 100)}% match
                  </div>
                )}
              </div>
              <div className="video-info">
                <h3 className="video-title">{video.title}</h3>
                <p className="video-channel">{video.channel}</p>
                <p className="video-views">{video.views}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="action-section">
          <h3>What would you like to do next?</h3>
          <div className="action-buttons">
            <button className="action-btn summary-btn" onClick={handleGenerateSummary}>
              <div className="btn-icon">📄</div>
              <span>Generate Summary</span>
            </button>
            <button className="action-btn quiz-btn" onClick={handleReadyForQuiz}> 
            <div className="btn-icon">🧩</div>
            <span>Ready for a Quiz?</span>
          </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchResults;