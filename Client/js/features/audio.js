import { SocketService } from "../services/socket.js";
import { UIManager } from "../utils/ui.js";

let isAudioActive = false;
let recordingInterval = null;
let remainingSeconds = 0;

export const AudioFeature = {
  init() {
    // Listen for server-sent audio file when recording completes
    SocketService.on("AUDIO_RECORD_FILE", this.handleAudioDownload.bind(this));

    // Wire UI buttons (in case HTML was added after init)
    const recBtn = document.getElementById("btn-audio-record");
    const cancelBtn = document.getElementById("btn-audio-cancel");
    if (recBtn) recBtn.onclick = () => this.startRecording();
    if (cancelBtn) cancelBtn.onclick = () => this.cancelRecording();
  },

  toggleAudio() {
    const btn = document.getElementById("btn-audio-toggle");
    const btnText = document.getElementById("btn-audio-text");
    const recBtn = document.getElementById("btn-audio-record");
    
    // --- DÒNG SỬA LỖI: Khai báo biến icon ---
    const icon = document.getElementById("btn-audio-icon"); 
    // ----------------------------------------

    isAudioActive = !isAudioActive;
    // const status = document.getElementById("audio-status"); // (Có thể bỏ nếu không dùng)

    if (isAudioActive) {
      // Trạng thái BẬT: Nút màu đỏ (Stop), Icon Stop
      if (btn) btn.className = "btn btn-danger w-100 mb-2 fw-bold";
      if (btnText) btnText.innerText = "Stop";
      if (icon) {
        icon.className = "fas fa-stop me-2"; // Sẽ hoạt động tốt khi đã có biến icon
      }
      if (recBtn) recBtn.disabled = false;
      UIManager.showToast("Audio ready", "info");
    } else {
      // Trạng thái TẮT: Nút màu xanh (Start), Icon Power
      if (btn) btn.className = "btn btn-success w-100 mb-2 fw-bold";
      if (btnText) btnText.innerText = "Start";
      if (icon) {
        icon.className = "fas fa-power-off me-2";
      }
      if (recBtn) recBtn.disabled = true;
      this.stopRecordingTimer(true);
      UIManager.showToast("Audio disabled", "info");
    }
  },
  
  startRecording() {
    if (!isAudioActive)
      return UIManager.showToast("Hãy bật Audio trước!", "error");

    const durationInput = document.getElementById("audio-record-duration");
    const duration = Math.max(
      3,
      Math.min(60, parseInt(durationInput ? durationInput.value : 10, 10) || 10)
    );

    const recordBtn = document.getElementById("btn-audio-record");
    const cancelBtn = document.getElementById("btn-audio-cancel");
    if (recordBtn) recordBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = false;
    if (durationInput) durationInput.disabled = true;

    this.startRecordingTimer(duration);
    SocketService.send("RECORD_AUDIO", duration);
    UIManager.showToast(`Đang ghi âm ${duration}s...`, "info");
  },

  cancelRecording() {
    this.stopRecordingTimer();
    SocketService.send("CANCEL_RECORD");
    UIManager.showToast("Đã hủy ghi âm", "info");
  },

  handleAudioDownload(data) {
    const payload = data.payload || data;
    if (!payload) return;

    // Convert base64 to blob and trigger download
    const binaryString = window.atob(payload);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);

    const time = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const fileName = `Audio_Rec_${time}.wav`;

    // Add to recent recordings list
    const recent = document.getElementById("audio-recent");
    if (recent) {
      const item = document.createElement("div");
      item.className = "d-flex align-items-center justify-content-between mb-2";
      item.innerHTML = `<div class="text-truncate me-2"><i class="fas fa-file-audio me-2"></i>${fileName}</div>
                              <div>
                                <a href="${url}" download="${fileName}" class="btn btn-sm btn-outline-primary me-2">Download</a>
                                <button class="btn btn-sm btn-outline-secondary" onclick="(function(u){const a=document.createElement('audio');a.src=u;a.controls=true;const c=document.getElementById('audio-preview-container');c.innerHTML='';c.appendChild(a);a.play();})(\'${url}\')">Play</button>
                              </div>`;
      // Remove placeholder text if present
      if (recent.querySelector("p")) recent.innerHTML = "";
      recent.prepend(item);
    }

    // Trigger automatic download as well
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);

    UIManager.showToast("Đã tải file âm thanh về máy!", "success");

    // Re-enable controls
    const durationInput = document.getElementById("audio-record-duration");
    const recordBtn = document.getElementById("btn-audio-record");
    const cancelBtn = document.getElementById("btn-audio-cancel");
    if (durationInput) durationInput.disabled = false;
    if (isAudioActive && recordBtn) recordBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = true;
    this.stopRecordingTimer();
  },

  startRecordingTimer(durationSec) {
    const timerEl = document.getElementById("audio-recording-timer-container");
    const countdownEl = document.getElementById("audio-recording-countdown");
    remainingSeconds = durationSec;
    if (timerEl) timerEl.style.display = "flex";
    if (countdownEl) countdownEl.textContent = `${remainingSeconds}s`;

    if (recordingInterval) clearInterval(recordingInterval);
    recordingInterval = setInterval(() => {
      remainingSeconds -= 1;
      if (countdownEl)
        countdownEl.textContent = `${Math.max(0, remainingSeconds)}s`;
      if (remainingSeconds <= 0) this.stopRecordingTimer();
    }, 1000);
  },

  stopRecordingTimer(forceHide = false) {
    if (recordingInterval) {
      clearInterval(recordingInterval);
      recordingInterval = null;
    }
    const timerEl = document.getElementById("audio-recording-timer-container");
    if (timerEl) timerEl.style.display = "none";
    remainingSeconds = 0;

    const durationInput = document.getElementById("audio-record-duration");
    const recordBtn = document.getElementById("btn-audio-record");
    const cancelBtn = document.getElementById("btn-audio-cancel");
    if (durationInput) durationInput.disabled = false;
    if (!forceHide && isAudioActive && recordBtn) recordBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = true;
  },
};
