import { SocketService } from '../services/socket.js';
import { UIManager } from '../utils/ui.js';

let currentPath = "";

export const FileManagerFeature = {
    init() {
        // Bind methods to this context
        SocketService.on('FILE_LIST', (data) => this.renderFiles(data));
        SocketService.on('FILE_DOWNLOAD_DATA', (data) => this.saveDownloadedFile(data));

        // UI Events
        document.getElementById('btn-file-home')?.addEventListener('click', () => this.getDrives());
        
        // Initialize breadcrumb home button
        this.initBreadcrumbHome();
        
        // Lazy load: Khi bấm vào tab Files lần đầu thì load ổ đĩa luôn
        const navFiles = document.getElementById('nav-files');
        if(navFiles) {
            let hasLoaded = false;
            navFiles.addEventListener('click', () => {
                if(!hasLoaded) {
                    hasLoaded = true;
                    setTimeout(() => {
                        this.getDrives();
                        // Re-initialize breadcrumb in case it wasn't loaded yet
                        this.initBreadcrumbHome();
                    }, 100);
                }
            });
        }
    },

    initBreadcrumbHome() {
        // Initialize the static breadcrumb home button that's in HTML
        const breadcrumbContainer = document.getElementById("file-breadcrumb");
        if(breadcrumbContainer) {
            const homeLink = breadcrumbContainer.querySelector('a');
            if(homeLink && !homeLink.dataset.initialized) {
                homeLink.dataset.initialized = 'true';
                homeLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.getDrives();
                });
            }
        }
    },

    getDrives() {
        currentPath = "";
        this.updatePathLabel("My Computer");
        SocketService.send("GET_DRIVES");
    },

    openFolder(path) {
        // Normalize path - ensure drive letters have trailing backslash if just root
        let normalizedPath = path;
        if (normalizedPath && normalizedPath.match(/^[A-Za-z]:$/)) {
            // If path is just "D:" add backslash to make it "D:\"
            normalizedPath = normalizedPath + "\\";
        }
        
        currentPath = normalizedPath;
        this.updatePathLabel(normalizedPath);
        console.log('Opening folder:', normalizedPath);
        SocketService.send("GET_DIR", normalizedPath);
    },

    updatePathLabel(path) {
        // Not used anymore - breadcrumb handles this in updateBreadcrumb()
        // Keep for backward compatibility if needed
    },

    renderFiles(data) {
        const items = data.payload || data;
        if(items.error) return UIManager.showToast(items.error, "error");

        const tbody = document.getElementById("file-list-body");
        if(!tbody) return;
        tbody.innerHTML = "";

        // Update breadcrumb
        this.updateBreadcrumb(currentPath);

        items.forEach(item => {
            const tr = document.createElement("tr");
            tr.style.cursor = (item.Type !== "FILE") ? "pointer" : "default";

            // 1. Type Icon Cell (centered, with padding)
            const tdIcon = document.createElement("td");
            tdIcon.className = "ps-4";
            
            // Create icon shape wrapper for better visual
            const iconWrapper = document.createElement("div");
            iconWrapper.className = "icon icon-shape icon-sm text-center border-radius-md";
            
            const icon = document.createElement("i");
            icon.className = "opacity-10";
            
            // Colorful icons based on type with gradient backgrounds
            if (item.Type === "DRIVE") {
                iconWrapper.className += " bg-gradient-info";
                icon.className += " fas fa-hdd";
            } else if (item.Type === "FOLDER") {
                iconWrapper.className += " bg-gradient-warning";
                icon.className += " fas fa-folder";
            } else if (item.Type === "BACK") {
                iconWrapper.className += " bg-gradient-secondary";
                icon.className += " fas fa-arrow-left";
            } else {
                // File icons - different colors based on extension
                const ext = item.Name.split('.').pop().toLowerCase();
                if(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(ext)) {
                    iconWrapper.className += " bg-gradient-info";
                    icon.className += " fas fa-file-image";
                } else if(['mp4', 'avi', 'mkv', 'mov'].includes(ext)) {
                    iconWrapper.className += " bg-gradient-danger";
                    icon.className += " fas fa-file-video";
                } else if(['mp3', 'wav', 'flac', 'aac'].includes(ext)) {
                    iconWrapper.className += " bg-gradient-success";
                    icon.className += " fas fa-file-audio";
                } else if(['pdf'].includes(ext)) {
                    iconWrapper.className += " bg-gradient-danger";
                    icon.className += " fas fa-file-pdf";
                } else if(['doc', 'docx'].includes(ext)) {
                    iconWrapper.className += " bg-gradient-primary";
                    icon.className += " fas fa-file-word";
                } else if(['xls', 'xlsx'].includes(ext)) {
                    iconWrapper.className += " bg-gradient-success";
                    icon.className += " fas fa-file-excel";
                } else if(['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
                    iconWrapper.className += " bg-gradient-warning";
                    icon.className += " fas fa-file-archive";
                } else if(['txt', 'log'].includes(ext)) {
                    iconWrapper.className += " bg-gradient-secondary";
                    icon.className += " fas fa-file-alt";
                } else if(['exe', 'msi'].includes(ext)) {
                    iconWrapper.className += " bg-gradient-dark";
                    icon.className += " fas fa-cog";
                } else {
                    iconWrapper.className += " bg-gradient-secondary";
                    icon.className += " fas fa-file";
                }
            }
            iconWrapper.appendChild(icon);
            tdIcon.appendChild(iconWrapper);

            // Click to open folder/drive
            if (item.Type !== "FILE") {
                tdIcon.onclick = () => FileManagerFeature.openFolder(item.Path);
            }

            // 2. Name Cell (with padding)
            const tdName = document.createElement("td");
            tdName.className = "ps-2";
            const nameText = document.createElement("p");
            nameText.className = "text-sm font-weight-bold mb-0";
            nameText.textContent = item.Name;
            tdName.appendChild(nameText);
            if (item.Type !== "FILE") {
                tdName.onclick = () => FileManagerFeature.openFolder(item.Path);
                tdName.style.cursor = "pointer";
            }

            // 3. Last Modified Cell
            const tdModified = document.createElement("td");
            const modifiedText = document.createElement("p");
            modifiedText.className = "text-xs text-secondary mb-0";
            modifiedText.textContent = item.LastModified || "—";
            tdModified.appendChild(modifiedText);

            // 4. Size Cell
            const tdSize = document.createElement("td");
            const sizeText = document.createElement("p");
            sizeText.className = "text-xs text-secondary mb-0";
            sizeText.textContent = item.Size || "—";
            tdSize.appendChild(sizeText);

            // 5. Actions Cell (aligned center with Soft UI buttons)
            const tdAction = document.createElement("td");
            tdAction.className = "text-center pe-4";
            
            if (item.Type === "FILE") {
                // Download button
                const btnDown = document.createElement("button");
                btnDown.className = "btn btn-link text-info px-2 mb-0";
                btnDown.title = "Download";
                btnDown.innerHTML = '<i class="fas fa-download text-sm"></i>';
                btnDown.onclick = (e) => {
                    e.stopPropagation();
                    if(confirm("Download this file?")) SocketService.send("DOWNLOAD_FILE", item.Path);
                };

                // Rename button
                const btnRename = document.createElement("button");
                btnRename.className = "btn btn-link text-dark px-2 mb-0";
                btnRename.title = "Rename";
                btnRename.innerHTML = '<i class="fas fa-edit text-sm"></i>';
                btnRename.onclick = (e) => {
                    e.stopPropagation();
                    const newName = prompt("Enter new name:", item.Name);
                    if(newName && newName !== item.Name) {
                        FileManagerFeature.renameFile(item.Path, newName);
                    }
                };

                // Delete button
                const btnDel = document.createElement("button");
                btnDel.className = "btn btn-link text-danger px-2 mb-0";
                btnDel.title = "Delete";
                btnDel.innerHTML = '<i class="fas fa-trash text-sm"></i>';
                btnDel.onclick = (e) => {
                    e.stopPropagation();
                    if(confirm("Delete this file permanently?")) {
                        SocketService.send("DELETE_FILE", item.Path);
                        setTimeout(() => FileManagerFeature.openFolder(currentPath), 1000);
                    }
                };

                tdAction.append(btnDown, btnRename, btnDel);
            } else if (item.Type === "FOLDER") {
                // Folder actions - rename and delete
                const btnRename = document.createElement("button");
                btnRename.className = "btn btn-link text-dark px-2 mb-0";
                btnRename.title = "Rename Folder";
                btnRename.innerHTML = '<i class="fas fa-edit text-sm"></i>';
                btnRename.onclick = (e) => {
                    e.stopPropagation();
                    const newName = prompt("Enter new folder name:", item.Name);
                    if(newName && newName !== item.Name) {
                        FileManagerFeature.renameFolder(item.Path, newName);
                    }
                };

                const btnDel = document.createElement("button");
                btnDel.className = "btn btn-link text-danger px-2 mb-0";
                btnDel.title = "Delete Folder";
                btnDel.innerHTML = '<i class="fas fa-trash text-sm"></i>';
                btnDel.onclick = (e) => {
                    e.stopPropagation();
                    if(confirm("Delete this folder and all its contents?")) {
                        FileManagerFeature.deleteFolder(item.Path);
                    }
                };
                tdAction.append(btnRename, btnDel);
            }

            tr.append(tdIcon, tdName, tdModified, tdSize, tdAction);
            tbody.appendChild(tr);
        });

        // Add hover effect styling
        if(items.length === 0) {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td colspan="5" class="text-center py-5">
                    <div class="icon icon-shape icon-lg bg-gradient-secondary shadow-secondary text-center border-radius-xl mb-3 mx-auto" style="width: 64px; height: 64px;">
                        <i class="fas fa-folder-open opacity-10 text-xl"></i>
                    </div>
                    <h6 class="text-secondary mb-0">This folder is empty</h6>
                </td>
            `;
            tbody.appendChild(tr);
        }
    },

    updateBreadcrumb(path) {
        const breadcrumbContainer = document.getElementById("file-breadcrumb");
        if(!breadcrumbContainer) return;
        
        // Clear breadcrumb (keep only home)
        breadcrumbContainer.innerHTML = `
            <li class="breadcrumb-item">
                <a href="#" class="text-primary" style="cursor: pointer;">
                    <i class="fas fa-home"></i> My Computer
                </a>
            </li>
        `;
        
        // Add event listener for home button
        const homeLink = breadcrumbContainer.querySelector('a');
        if(homeLink) {
            homeLink.addEventListener('click', (e) => {
                e.preventDefault();
                FileManagerFeature.getDrives();
            });
        }
        
        // If no path or empty, we're at root (showing drives)
        if(!path || path === "") {
            return;
        }
        
        // Split path into parts
        // Windows path format: C:\folder1\folder2\folder3
        // Handle both "C:" and "C:\" formats - normalize for display
        let normalizedPath = path;
        
        // Remove trailing backslash for non-root paths (e.g., "D:\folder\" -> "D:\folder")
        // But keep it for root drives (e.g., "D:\" stays as "D:\")
        if(normalizedPath.endsWith('\\') && normalizedPath.length > 3) {
            normalizedPath = normalizedPath.slice(0, -1);
        }
        
        const parts = normalizedPath.split('\\').filter(p => p);
        
        // If we only have drive letter, make sure it's displayed correctly
        if(parts.length === 0) return;
        
        // Build clickable breadcrumb
        let accumulatedPath = "";
        parts.forEach((part, index) => {
            const li = document.createElement("li");
            
            // Build path up to this part
            if(index === 0) {
                // Drive letter (e.g., "C:")
                accumulatedPath = part;
                // Ensure drive letter has proper format
                if(!accumulatedPath.endsWith(':')) {
                    accumulatedPath += ':';
                }
            } else {
                accumulatedPath += "\\" + part;
            }
            
            const pathToNavigate = accumulatedPath; // Capture for closure
            
            // Determine if this is the last item
            const isLast = (index === parts.length - 1);
            
            // Special case: if we're at drive root and have only 1 part, make it clickable
            // This allows refreshing the drive view
            const isDriveRoot = (parts.length === 1 && index === 0);
            const isDrive = (index === 0); // First element is always a drive
            
            if(isLast && !isDriveRoot) {
                // Last item (not drive root) is active and not clickable
                li.className = "breadcrumb-item active";
                li.setAttribute("aria-current", "page");
                
                // Add icon for drives even when active
                if(isDrive) {
                    const icon = document.createElement("i");
                    icon.className = "fas fa-hdd me-1";
                    li.appendChild(icon);
                }
                
                const textNode = document.createTextNode(part);
                li.appendChild(textNode);
            } else {
                // Clickable items (including drive root)
                li.className = "breadcrumb-item";
                const link = document.createElement("a");
                link.href = "#";
                link.className = "text-primary text-decoration-none";
                link.style.cursor = "pointer";
                
                // Add icon for drives
                if(isDrive) {
                    const icon = document.createElement("i");
                    icon.className = "fas fa-hdd me-1";
                    link.appendChild(icon);
                }
                
                const textNode = document.createTextNode(part);
                link.appendChild(textNode);
                
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Breadcrumb clicked:', pathToNavigate);
                    try {
                        FileManagerFeature.openFolder(pathToNavigate);
                    } catch (error) {
                        console.error('Error opening folder:', error);
                        UIManager.showToast('Error navigating to folder', 'error');
                    }
                });
                li.appendChild(link);
            }
            
            breadcrumbContainer.appendChild(li);
        });
    },

    saveDownloadedFile(packet) {
        const payload = packet.payload || packet;
        const { fileName, data } = payload; // data là base64
        const link = document.createElement('a');
        link.href = 'data:application/octet-stream;base64,' + data;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        UIManager.showToast(`Đã tải xuống: ${fileName}`, "success");
    },

    renameFile(filePath, newName) {
        const payload = { path: filePath, newName: newName };
        SocketService.send("RENAME_FILE", JSON.stringify(payload));
        setTimeout(() => this.openFolder(currentPath), 500);
    },

    renameFolder(folderPath, newName) {
        const payload = { path: folderPath, newName: newName };
        SocketService.send("RENAME_FOLDER", JSON.stringify(payload));
        setTimeout(() => this.openFolder(currentPath), 500);
    },

    deleteFolder(folderPath) {
        SocketService.send("DELETE_FOLDER", folderPath);
        setTimeout(() => {
            if (!currentPath || currentPath === "") {
                this.getDrives();
            } else {
                this.openFolder(currentPath);
            }
        }, 500);
    },

    createFolder() {
        if (!currentPath || currentPath === "") {
            UIManager.showToast("Please navigate to a folder first!", "warning");
            return;
        }
        
        const folderName = prompt("Enter new folder name:");
        if (folderName && folderName.trim() !== "") {
            const payload = {
                path: currentPath,
                name: folderName.trim()
            };
            
            SocketService.send("CREATE_FOLDER", JSON.stringify(payload));
            UIManager.showToast(`Creating folder: ${folderName}...`, "info");
            
            // Refresh the current directory after a short delay
            setTimeout(() => this.openFolder(currentPath), 800);
        }
    },

    uploadFile(files) {
        if (!files || files.length === 0) return;
        
        const file = files[0];
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const base64String = e.target.result.split(',')[1];
            const payload = {
                path: currentPath || "C:\\", // fallback to C: if no path selected
                fileName: file.name,
                data: base64String
            };
            
            UIManager.showToast(`Uploading ${file.name}...`, "info");
            SocketService.send("UPLOAD_FILE", JSON.stringify(payload));
            
            setTimeout(() => this.openFolder(currentPath || "C:\\"), 1000);
        };
        
        reader.onerror = () => {
            UIManager.showToast("Error reading file", "error");
        };
        
        reader.readAsDataURL(file);
    },

    searchOnServer(keyword) {
        if (!keyword || keyword.trim() === "") {
            // If empty, just reload current folder
            this.openFolder(currentPath);
            return;
        }

        UIManager.showToast(`Searching for "${keyword}"...`, "info");
        
        // Use currentPath as root, or default to C:\
        const searchRoot = currentPath || "C:\\";
        
        const payload = {
            path: searchRoot,
            keyword: keyword
        };
        
        // Send command to server
        SocketService.send("SEARCH_FILE", JSON.stringify(payload));
    },
};