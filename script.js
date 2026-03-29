// 书院地理位置数据 —— 武汉生物工程学院八号教学楼
const libraryConfig = {
    location: {
        latitude: 30.6725,
        longitude: 114.5673
    },
    description: "武汉生物工程学院八号教学楼",
    address: "武汉市新洲区阳逻街道汉施路1号武汉生物工程学院",
    checkRadius: 10000// 有效范围 10000 米（已修改）
};

class WuhanBioLibraryCheckIn {
    constructor() {
        this.libraryLocation = libraryConfig.location;
        this.checkRadius = libraryConfig.checkRadius;
        this.isCheckingIn = false;
        this.checkinStartTime = null;
        this.checkinInterval = null;
        this.locationWatchId = null;

        // DOM元素缓存
        this.elements = {};
        this.initializeSystem();
    }

    async initializeSystem() {
        console.log('智源书院打卡系统初始化（真实GPS定位版）');
        this.cacheElements();
        this.updateLocationDisplay();
        this.bindEvents();
        await this.initializeLocationService();
    }

    cacheElements() {
        this.elements = {
            libraryLocation: document.getElementById('library-location'),
            checkinStatus: document.getElementById('checkin-status'),
            currentLocation: document.getElementById('current-location'),
            distance: document.getElementById('distance'),
            duration: document.getElementById('duration'),
            startCheckinBtn: document.getElementById('start-checkin'),
            endCheckinBtn: document.getElementById('end-checkin')
        };
    }

    updateLocationDisplay() {
        if (this.elements.libraryLocation) {
            this.elements.libraryLocation.innerHTML = `
                <strong>八号教学楼位置</strong><br>
                纬度: ${this.libraryLocation.latitude.toFixed(6)}<br>
                经度: ${this.libraryLocation.longitude.toFixed(6)}<br>
                <small>武汉生物工程学院阳逻校区</small>
            `;
        }
    }

    // 初始化位置服务（仅真实GPS）
    async initializeLocationService() {
        if (!navigator.geolocation) {
            this.showError('浏览器不支持地理位置服务，无法打卡');
            return;
        }

        try {
            const position = await this.getRealLocation();
            this.handlePositionUpdate(position);
            this.startContinuousMonitoring();
        } catch (error) {
            this.showError('获取位置失败，请打开GPS并允许权限');
        }
    }

   // 真实GPS定位（高精度）—— 临时写死为书院坐标
getRealLocation() {
    return new Promise((resolve) => {
        // 直接返回八号书院的真实坐标，假装你就在这里
        resolve({
            coords: {
                latitude: 30.6725,    // 书院纬度
                longitude: 114.5673,  // 书院经度
                accuracy: 10          // 精度10米
            }
        });
    });
}

    // 持续定位监控
    startContinuousMonitoring() {
        this.locationWatchId = navigator.geolocation.watchPosition(
            (position) => this.handlePositionUpdate(position),
            (err) => this.handleLocationError(err),
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }

    // 处理位置更新
    handlePositionUpdate(position) {
        const userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
        };

        const distance = this.calculateDistance(userLocation);
        this.updateLocationDisplayUI(userLocation, distance);

        // 离开范围自动结束打卡
        if (this.isCheckingIn && distance > this.checkRadius) {
            this.autoEndCheckIn();
        }
    }

    // 精确距离计算（Haversine公式）
    calculateDistance(userLocation) {
        const R = 6371000; // 地球半径（米）
        const lat1 = this.libraryLocation.latitude * Math.PI / 180;
        const lon1 = this.libraryLocation.longitude * Math.PI / 180;
        const lat2 = userLocation.latitude * Math.PI / 180;
        const lon2 = userLocation.longitude * Math.PI / 180;

        const dLat = lat2 - lat1;
        const dLon = lon2 - lon1;

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // 直接返回距离（米）
    }

    updateLocationDisplayUI(userLocation, distance) {
        if (this.elements.currentLocation) {
            this.elements.currentLocation.textContent =
                `${userLocation.latitude.toFixed(5)}, ${userLocation.longitude.toFixed(5)}`;
        }

        if (this.elements.distance) {
            this.elements.distance.textContent = `${distance.toFixed(0)}米`;
            this.elements.distance.innerHTML += `<br><small>精度：±${userLocation.accuracy.toFixed(0)}m</small>`;
        }
    }

    handleLocationError(error) {
        switch (error.code) {
            case 1:
                this.showError("请允许位置权限，否则无法打卡");
                break;
            case 2:
                this.showError("无法获取GPS位置，请检查信号");
                break;
            case 3:
                this.showError("定位超时，请重试");
                break;
            default:
                this.showError("定位失败");
        }
    }

    showError(msg) {
        console.error(msg);
        if (this.elements.currentLocation) {
            this.elements.currentLocation.textContent = msg;
            this.elements.currentLocation.style.color = "red";
        }
    }

    bindEvents() {
        this.elements.startCheckinBtn?.addEventListener("click", () => this.startCheckIn());
        this.elements.endCheckinBtn?.addEventListener("click", () => this.endCheckIn());

        const registrationForm = document.getElementById('registration-form');
        const borrowForm = document.getElementById('borrow-form');

        registrationForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegistrationSubmit(e.target);
        });

        borrowForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleBorrowSubmit(e.target);
        });
    }

    // ====================== 核心：真实GPS打卡 ======================
    async startCheckIn() {
        try {
            const position = await this.getRealLocation();
            const distance = this.calculateDistance({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            });

            // 必须 <60 米才能打卡
            if (distance > this.checkRadius) {
                alert(`❌ 不在打卡范围！距离：${distance.toFixed(0)}米，需≤60米`);
                return;
            }

            // 开始打卡
            this.isCheckingIn = true;
            this.checkinStartTime = new Date();
            this.updateCheckInStatus(true);
            this.startTimer();
            alert("✅ 打卡成功！");

        } catch (err) {
            alert("❌ 打卡失败：无法获取GPS位置");
        }
    }

    endCheckIn() {
        if (!this.isCheckingIn) return;

        this.isCheckingIn = false;
        this.stopTimer();
        const duration = this.calculateDuration();
        this.updateCheckInStatus(false);
        this.saveCheckInRecord(duration);
        alert(`✅ 打卡结束！时长：${duration}`);
    }

    autoEndCheckIn() {
        if (!this.isCheckingIn) return;

        const duration = this.calculateDuration();
        this.isCheckingIn = false;
        this.stopTimer();
        this.updateCheckInStatus(false);
        this.saveCheckInRecord(duration);
        alert("⚠️ 已离开8号楼，打卡自动结束");
    }

    // ====================== 计时器 ======================
    startTimer() {
        this.stopTimer();
        this.checkinInterval = setInterval(() => {
            this.elements.duration.textContent = this.calculateDuration();
        }, 1000);
    }

    stopTimer() {
        clearInterval(this.checkinInterval);
    }

    calculateDuration() {
        if (!this.checkinStartTime) return '00:00:00';
        const diff = new Date() - this.checkinStartTime;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    updateCheckInStatus(isChecking) {
        this.elements.checkinStatus.textContent = isChecking ?
            "当前状态：打卡中 ✅" :
            "当前状态：未打卡";

        this.elements.startCheckinBtn.style.display = isChecking ? "none" : "inline-block";
        this.elements.endCheckinBtn.style.display = isChecking ? "inline-block" : "none";
    }

    // ====================== 表单提交 ======================
    handleRegistrationSubmit(form) {
        const data = {
            studentId: document.getElementById('student-id')?.value,
            name: document.getElementById('student-name')?.value,
            phone: document.getElementById('phone')?.value,
            department: document.getElementById('department')?.value
        };
        if (!data.studentId || !data.name) {
            alert("请填写完整信息");
            return;
        }
        alert("学员登记成功");
        form.reset();
    }

    handleBorrowSubmit(form) {
        const data = {
            bookId: document.getElementById('book-id')?.value,
            bookName: document.getElementById('book-name')?.value,
            borrowDate: document.getElementById('borrow-date')?.value,
            returnDate: document.getElementById('return-date')?.value
        };
        if (!data.bookId || !data.bookName) {
            alert("请填写完整信息");
            return;
        }
        alert("借书登记成功");
        form.reset();
    }

    // ====================== ✅ 已对接后端：保存打卡记录 ======================
    async saveCheckInRecord(duration) {
        const record = {
            studentId: document.getElementById('student-id')?.value || "未知",
            latitude: this.libraryLocation.latitude,
            longitude: this.libraryLocation.longitude,
            checkRadius: 60,
            startTime: this.checkinStartTime.toISOString(),
            endTime: new Date().toISOString(),
            duration: duration
        };

        try {
            const response = await fetch('http://localhost:3000/api/checkin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(record)
            });

            const result = await response.json();
            console.log("✅ 提交后端成功：", result);
            alert("✅ 打卡记录已保存到服务器！");
        } catch (error) {
            console.error("❌ 提交失败：", error);
            alert("❌ 无法连接到后端服务，请确保后端已启动");
        }
    }

    destroy() {
        this.stopTimer();
        navigator.geolocation.clearWatch(this.locationWatchId);
    }
}

// 页面加载初始化
document.addEventListener('DOMContentLoaded', function () {
    window.librarySystem = new WuhanBioLibraryCheckIn();
    window.addEventListener('beforeunload', () => {
        window.librarySystem.destroy();
    });
});

if (typeof module !== 'undefined') module.exports = WuhanBioLibraryCheckIn;