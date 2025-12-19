class BallGame {
    constructor() {
        this.ball = document.getElementById('ball');
        this.hole = document.getElementById('hole');
        this.container = document.getElementById('container');
        this.startOverlay = document.getElementById('start-overlay');
        this.resultOverlay = document.getElementById('result-overlay');
        this.startBtn = document.getElementById('start-btn');
        this.retryBtn = document.getElementById('retry-btn');
        this.timerDisplay = document.getElementById('timer');
        this.resultTime = document.getElementById('result-time');
        this.bestTimeDisplay = document.getElementById('best-time');
        this.debug = document.getElementById('debug');
        
        // ボールの状態
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        
        // 穴の位置
        this.holeX = 0;
        this.holeY = 0;
        
        // サイズ
        this.ballSize = 50;
        this.holeSize = 70;
        
        // 物理パラメータ
        this.gravity = 0.5;
        this.friction = 0.98;
        this.bounce = 0.6;
        
        // 傾きデータ
        this.tiltX = 0;
        this.tiltY = 0;
        
        // キャリブレーション
        this.baseBeta = null;
        this.calibrationSamples = [];
        
        // タイマー
        this.startTime = 0;
        this.elapsedTime = 0;
        this.bestTime = this.loadBestTime();
        
        this.isRunning = false;
        this.isFallen = false;
        
        this.init();
    }
    
    init() {
        this.centerBall();
        this.placeHoleRandomly();
        this.updateBallPosition();
        this.updateHolePosition();
        
        this.startBtn.addEventListener('click', () => this.start());
        this.retryBtn.addEventListener('click', () => this.retry());
        window.addEventListener('resize', () => this.handleResize());
    }
    
    centerBall() {
        const containerWidth = window.innerWidth - 8;
        const containerHeight = window.innerHeight - 8;
        this.x = (containerWidth - this.ballSize) / 2;
        this.y = (containerHeight - this.ballSize) / 2;
    }
    
    placeHoleRandomly() {
        const margin = 80;
        const containerWidth = window.innerWidth - 8;
        const containerHeight = window.innerHeight - 8;
        
        let attempts = 0;
        do {
            this.holeX = margin + Math.random() * (containerWidth - this.holeSize - margin * 2);
            this.holeY = margin + Math.random() * (containerHeight - this.holeSize - margin * 2);
            attempts++;
        } while (this.getDistanceToHole() < 150 && attempts < 50);
    }
    
    updateHolePosition() {
        this.hole.style.left = this.holeX + 'px';
        this.hole.style.top = this.holeY + 'px';
    }
    
    getDistanceToHole() {
        const ballCenterX = this.x + this.ballSize / 2;
        const ballCenterY = this.y + this.ballSize / 2;
        const holeCenterX = this.holeX + this.holeSize / 2;
        const holeCenterY = this.holeY + this.holeSize / 2;
        
        const dx = ballCenterX - holeCenterX;
        const dy = ballCenterY - holeCenterY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    loadBestTime() {
        const saved = localStorage.getItem('ballGame_bestTime');
        return saved ? parseFloat(saved) : null;
    }
    
    saveBestTime(time) {
        localStorage.setItem('ballGame_bestTime', time.toString());
    }
    
    async start() {
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission !== 'granted') {
                    alert('傾きセンサーの許可が必要です');
                    return;
                }
            } catch (error) {
                console.error('Permission error:', error);
                alert('センサーの許可でエラーが発生しました');
                return;
            }
        }
        
        this.startBtn.textContent = 'キャリブレーション中...';
        this.startBtn.disabled = true;
        
        this.calibrationSamples = [];
        
        const calibrationHandler = (e) => {
            if (e.beta !== null) {
                this.calibrationSamples.push(e.beta);
            }
        };
        
        window.addEventListener('deviceorientation', calibrationHandler);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        window.removeEventListener('deviceorientation', calibrationHandler);
        
        if (this.calibrationSamples.length > 0) {
            const sum = this.calibrationSamples.reduce((a, b) => a + b, 0);
            this.baseBeta = sum / this.calibrationSamples.length;
        } else {
            this.baseBeta = 0;
        }
        
        window.addEventListener('deviceorientation', (e) => this.handleOrientation(e));
        
        this.startOverlay.classList.add('hidden');
        
        this.startTime = performance.now();
        
        this.isRunning = true;
        this.isFallen = false;
        this.gameLoop();
    }
    
    retry() {
        this.resultOverlay.classList.add('hidden');
        this.ball.classList.remove('falling');
        
        this.centerBall();
        this.placeHoleRandomly();
        this.updateBallPosition();
        this.updateHolePosition();
        
        this.vx = 0;
        this.vy = 0;
        
        this.startTime = performance.now();
        this.timerDisplay.textContent = '0.00';
        
        this.isRunning = true;
        this.isFallen = false;
        this.gameLoop();
    }
    
    handleOrientation(event) {
        if (!this.isRunning) return;
        
        let gamma = event.gamma || 0;
        let beta = event.beta || 0;
        
        gamma = Math.max(-30, Math.min(30, gamma));
        
        let betaOffset = beta - this.baseBeta;
        betaOffset = Math.max(-30, Math.min(30, betaOffset));
        
        this.tiltX = gamma / 30;
        this.tiltY = betaOffset / 30;
        
        this.debug.innerHTML = `
            基準β: ${this.baseBeta.toFixed(1)}°<br>
            現在β: ${beta.toFixed(1)}°<br>
            βOffset: ${betaOffset.toFixed(1)}°<br>
            γ(左右): ${gamma.toFixed(1)}°<br>
            穴まで: ${this.getDistanceToHole().toFixed(0)}px
        `;
    }
    
    gameLoop() {
        if (!this.isRunning) return;
        
        this.update();
        this.updateTimer();
        this.checkHole();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    updateTimer() {
        this.elapsedTime = (performance.now() - this.startTime) / 1000;
        this.timerDisplay.textContent = this.elapsedTime.toFixed(2);
    }
    
    checkHole() {
        const distance = this.getDistanceToHole();
        // 球の中心が穴の中心にほぼ重なったら落ちる
        const fallThreshold = 5;
        
        if (distance < fallThreshold) {
            this.fallIntoHole();
        }
    }
    
    fallIntoHole() {
        this.isRunning = false;
        this.isFallen = true;
        
        const holeCenterX = this.holeX + (this.holeSize - this.ballSize) / 2;
        const holeCenterY = this.holeY + (this.holeSize - this.ballSize) / 2;
        this.x = holeCenterX;
        this.y = holeCenterY;
        this.updateBallPosition();
        
        this.ball.classList.add('falling');
        
        setTimeout(() => {
            this.showResult();
        }, 500);
    }
    
    showResult() {
        const time = this.elapsedTime;
        let isNewBest = false;
        
        if (this.bestTime === null || time < this.bestTime) {
            this.bestTime = time;
            this.saveBestTime(time);
            isNewBest = true;
        }
        
        this.resultTime.textContent = time.toFixed(2) + ' 秒';
        
        if (isNewBest) {
            this.bestTimeDisplay.textContent = '🎉 新記録！';
        } else {
            this.bestTimeDisplay.textContent = 'ベスト: ' + this.bestTime.toFixed(2) + ' 秒';
        }
        
        this.resultOverlay.classList.remove('hidden');
    }
    
    update() {
        this.vx += this.tiltX * this.gravity;
        this.vy += this.tiltY * this.gravity;
        
        this.vx *= this.friction;
        this.vy *= this.friction;
        
        this.x += this.vx;
        this.y += this.vy;
        
        const maxX = window.innerWidth - this.ballSize - 8;
        const maxY = window.innerHeight - this.ballSize - 8;
        
        if (this.x < 0) {
            this.x = 0;
            this.vx = -this.vx * this.bounce;
        }
        if (this.x > maxX) {
            this.x = maxX;
            this.vx = -this.vx * this.bounce;
        }
        if (this.y < 0) {
            this.y = 0;
            this.vy = -this.vy * this.bounce;
        }
        if (this.y > maxY) {
            this.y = maxY;
            this.vy = -this.vy * this.bounce;
        }
        
        this.updateBallPosition();
    }
    
    updateBallPosition() {
        this.ball.style.transform = `translate(${this.x}px, ${this.y}px)`;
    }
    
    handleResize() {
        const maxX = window.innerWidth - this.ballSize - 8;
        const maxY = window.innerHeight - this.ballSize - 8;
        
        this.x = Math.max(0, Math.min(this.x, maxX));
        this.y = Math.max(0, Math.min(this.y, maxY));
        this.updateBallPosition();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new BallGame();
});
