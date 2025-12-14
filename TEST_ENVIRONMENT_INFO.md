# TestNewWeb - Test Environment

## 📋 Mô Tả
Đây là bản copy của **computer_networking_proj** dùng để test các chức năng mới và thử nghiệm thay đổi giao diện **mà không ảnh hưởng code gốc**.

## ✅ Ưu Điểm
- ✅ Code gốc ở `computer_networking_proj/` vẫn an toàn
- ✅ Có thể tự do thay đổi UI/UX ở đây
- ✅ Test các tính năng mới trước khi merge
- ✅ Git repository riêng - không liên kết với GitHub

## 📁 Cấu Trúc
```
TestNewWeb/
├── Client/              # Frontend (HTML, CSS, JS)
│   ├── index.html
│   ├── css/
│   └── js/
├── Server/              # Backend (.NET C#)
│   ├── Core/
│   ├── Services/
│   └── Server.csproj
└── Documentation/       # Docs từ project gốc
```

## 🔄 Workflow Đề Nghị
1. **Test tính năng mới** → Thực hiện ở TestNewWeb
2. **Thay đổi giao diện** → Thử nghiệm ở đây trước
3. **Nếu OK** → Port code sang computer_networking_proj
4. **Commit & Push** → computer_networking_proj lên GitHub

## 🚀 Hướng Dẫn Sử Dụng

### Client (Frontend)
```bash
# Chỉnh sửa files trong TestNewWeb/Client/
# - index.html (HTML structure)
# - css/ (styling)
# - js/ (logic)

# Mở trực tiếp trong browser hoặc setup server tĩnh
```

### Server (Backend)
```bash
cd TestNewWeb/Server
dotnet restore
dotnet build
dotnet run
```

## 💡 Mẹo
- Giữ `computer_networking_proj/` cho production code
- Sử dụng `TestNewWeb/` cho R&D và experimentation
- Đặt tên rõ ràng cho branches nếu dùng Git: `test/feature-name`

---
**Tạo:** 2025-12-15
**Trạng thái:** Ready for testing ✨
