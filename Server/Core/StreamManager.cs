using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using OpenCvSharp; // Cần thư viện này (đã có trong .csproj)
using RemoteControlServer.Helpers;

namespace RemoteControlServer.Core
{
    public static class StreamManager
    {
        private static bool _isStreaming = false;
        private static byte[] _lastFrame = null;

        // --- Variables cho Recording ---
        private static bool _isRecording = false;
        private static VideoWriter _writer;
        private static string _currentSavePath;
        private static DateTime _stopRecordTime;
        
        // Sự kiện báo khi file video đã lưu xong
        public static event Action<string> OnScreenVideoSaved;

        public static bool IsStreaming => _isStreaming;

        public static void StartStreaming()
        {
            _isStreaming = true;
        }

        public static void StopStreaming()
        {
            _isStreaming = false;
            // Nếu đang ghi hình mà tắt stream thì dừng ghi luôn
            if (_isRecording) StopRecording();
        }

        // --- Hàm Start Recording ---
        public static string StartRecording(int durationSeconds)
        {
            if (!_isStreaming) return "Lỗi: Hãy bật Stream màn hình trước!";
            if (_isRecording) return "Đang ghi hình rồi!";

            try
            {
                string tempFolder = Path.GetTempPath();
                string fileName = $"ScreenRec_{DateTime.Now:HHmmss}.avi";
                _currentSavePath = Path.Combine(tempFolder, fileName);

                _stopRecordTime = DateTime.Now.AddSeconds(durationSeconds);
                _isRecording = true;

                return $"Đang ghi màn hình... ({durationSeconds}s)";
            }
            catch (Exception ex)
            {
                return "Lỗi StartRecord: " + ex.Message;
            }
        }

        // --- Hàm Stop Recording ---
        private static void StopRecording()
        {
            if (!_isRecording) return;
            _isRecording = false;
            Thread.Sleep(200); // Đợi ghi nốt frame

            if (_writer != null)
            {
                _writer.Release();
                _writer = null;
                Console.WriteLine($">> Đã lưu video màn hình: {_currentSavePath}");
                
                // Bắn sự kiện để ServerCore gửi file
                OnScreenVideoSaved?.Invoke(_currentSavePath);
            }
        }

        public static void StartScreenLoop()
        {
            Task.Run(() =>
            {
                while (true)
                {
                    if (_isStreaming && SocketManager.All.Count > 0)
                    {
                        try
                        {
                            // Lấy ảnh JPEG chất lượng 85
                            var currentFrame = SystemHelper.GetScreenShot(85L);
                            
                            if (currentFrame != null)
                            {
                                // 1. Xử lý Gửi Stream (Logic cũ)
                                bool isDuplicate = _lastFrame != null && currentFrame.Length == _lastFrame.Length && currentFrame.SequenceEqual(_lastFrame);
                                
                                if (!isDuplicate)
                                {
                                    _lastFrame = currentFrame;
                                    SocketManager.BroadcastBinary(0x01, currentFrame);
                                }

                                // 2. Xử lý Ghi hình (Logic mới)
                                if (_isRecording)
                                {
                                    // Convert byte[] JPEG sang Mat của OpenCV để ghi video
                                    // Lưu ý: Việc này tốn CPU hơn một chút
                                    using (var mat = Cv2.ImDecode(currentFrame, ImreadModes.Color))
                                    {
                                        if (mat != null && !mat.Empty())
                                        {
                                            if (_writer == null || !_writer.IsOpened())
                                            {
                                                // Khởi tạo Writer nếu chưa có
                                                // FPS để khoảng 10-15 tùy tốc độ mạng/máy
                                                _writer = new VideoWriter(_currentSavePath, FourCC.MJPG, 10, mat.Size());
                                            }

                                            if (_writer.IsOpened())
                                            {
                                                _writer.Write(mat);
                                            }
                                        }
                                    }

                                    // Kiểm tra thời gian dừng
                                    if (DateTime.Now >= _stopRecordTime)
                                    {
                                        StopRecording();
                                    }
                                }
                            }
                        }
                        catch (Exception ex) { Console.WriteLine("Lỗi Stream/Record: " + ex.Message); }

                        // Delay giữa các frame (khoảng 30ms ~ 30fps lý thuyết, thực tế thấp hơn do xử lý)
                        Thread.Sleep(30);
                    }
                    else
                    {
                        Thread.Sleep(500);
                        _lastFrame = null;
                    }
                }
            });
        }
    }
}