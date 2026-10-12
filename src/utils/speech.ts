/**
 * Phát âm tiếng Nhật sử dụng Web Speech API
 */
export function speakJapanese(text: string): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  try {
    window.speechSynthesis.cancel(); // Dừng phát âm trước nếu có
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.85; // Tốc độ vừa phải cho người học
    utterance.pitch = 1.0;

    // Ưu tiên chọn giọng tiếng Nhật nếu có
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find(
      (v) => v.lang.startsWith('ja') || v.lang.includes('JP') || v.name.toLowerCase().includes('japan')
    );
    if (jaVoice) {
      utterance.voice = jaVoice;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('Lỗi phát âm SpeechSynthesis:', err);
    return false;
  }
}
