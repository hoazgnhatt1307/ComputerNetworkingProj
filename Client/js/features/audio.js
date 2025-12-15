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

    // 1. Chuyển đổi base64 sang blob
    const binaryString = window.atob(payload);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: "audio/wav" });
    const url = URL.createObjectURL(blob); // Tạo URL cho file âm thanh

    const time = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const fileName = `Audio_Rec_${time}.wav`;

    // 2. Cập nhật giao diện: Chỉ hiện nút Play
    const recent = document.getElementById("audio-recent");
    if (recent) {
      const item = document.createElement("div");
      item.className = "d-flex align-items-center justify-content-between mb-2";
      
      // Giao diện chỉ có Tên file + Nút Play (Không có nút Download ở đây)
      item.innerHTML = `
        <div class="text-truncate me-2">
            <i class="fas fa-file-audio me-2"></i>${fileName}
        </div>
        <div>
            <button class="btn btn-sm btn-outline-success" onclick="(function(u){
                const container = document.getElementById('audio-preview-container');
                container.innerHTML = ''; 
                
                const audio = document.createElement('audio');
                audio.src = u;
                audio.controls = true;
                audio.style.width = '100%';
                audio.style.marginTop = '10px';
                
                container.appendChild(audio);
                audio.play();
            })('${url}')">
                <i class="fas fa-play me-1"></i> Play
            </button>
        </div>`;

      if (recent.querySelector("p")) recent.innerHTML = "";
      recent.prepend(item);
    }

    // 3. TỰ ĐỘNG TẢI XUỐNG (Đã thêm lại phần này)
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    // LƯU Ý QUAN TRỌNG: 
    // Mình đã xóa dòng URL.revokeObjectURL(url) ở đây.
    // Điều này giúp file vẫn tồn tại trong bộ nhớ trình duyệt để nút Play hoạt động.
    setTimeout(() => {
      document.body.removeChild(a);
      // Không revoke URL ở đây nữa!
    }, 100);

    UIManager.showToast("Đã lưu file & sẵn sàng phát!", "success");

    // 4. Reset trạng thái các nút
    const durationInput = document.getElementById("audio-record-duration");
    const recordBtn = document.getElementById("btn-audio-record");
    const cancelBtn = document.getElementById("btn-audio-cancel");
    
    if (durationInput) durationInput.disabled = false;
    
    // Kiểm tra an toàn biến global
    if (typeof isAudioActive !== 'undefined' && isAudioActive && recordBtn) {
        recordBtn.disabled = false;
    } else if (recordBtn) {
        recordBtn.disabled = false; 
    }
    
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
