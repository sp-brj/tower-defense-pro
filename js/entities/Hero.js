// ============================================
// КЛАСС ГЕРОЯ (Kingdom Rush стиль)
// ============================================

class Hero {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;

        // Характеристики из конфига
        const cfg = CONFIG.HERO;
        this.maxHp = cfg.hp;
        this.hp = cfg.hp;
        this.damage = cfg.damage;
        this.attackSpeed = cfg.attackSpeed;
        this.speed = cfg.speed;
        this.range = cfg.range;
        this.respawnTime = cfg.respawnTime;

        // Состояние
        this.alive = true;
        this.respawnTimer = 0;
        this.attackCooldown = 0;

        // Цель
        this.target = null;

        // Анимация
        this.attackAnimation = 0;
        this.walkAnimation = 0;

        // Внешний вид
        this.radius = 14;
        this.color = '#ffd43b';
    }

    update(enemies) {
        // Респавн
        if (!this.alive) {
            this.respawnTimer--;
            if (this.respawnTimer <= 0) {
                this.respawn();
            }
            return;
        }

        // Обновление кулдаунов
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }

        if (this.attackAnimation > 0) {
            this.attackAnimation--;
        }

        // Движение к точке назначения
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distToTarget = Math.sqrt(dx * dx + dy * dy);

        if (distToTarget > 5) {
            this.x += (dx / distToTarget) * this.speed;
            this.y += (dy / distToTarget) * this.speed;
            this.walkAnimation = (this.walkAnimation + 1) % 20;
        }

        // Поиск цели для атаки
        this.target = this.findTarget(enemies);

        if (this.target && this.attackCooldown <= 0) {
            const distToEnemy = Math.sqrt(
                (this.target.x - this.x) ** 2 +
                (this.target.y - this.y) ** 2
            );

            if (distToEnemy <= this.range) {
                this.attack();
            }
        }
    }

    findTarget(enemies) {
        let bestTarget = null;
        let bestDist = Infinity;

        for (const enemy of enemies) {
            if (!enemy.alive) continue;

            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= this.range * 2 && dist < bestDist) {
                bestDist = dist;
                bestTarget = enemy;
            }
        }

        return bestTarget;
    }

    attack() {
        if (!this.target || !this.target.alive) return;

        this.target.takeDamage(this.damage);
        this.attackCooldown = this.attackSpeed * 60;
        this.attackAnimation = 15;

        audio.play('heroAttack');
    }

    moveTo(x, y) {
        this.targetX = x;
        this.targetY = y;
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    die() {
        this.alive = false;
        this.respawnTimer = this.respawnTime / (1000 / 60); // Конвертация в кадры
    }

    respawn() {
        this.alive = true;
        this.hp = this.maxHp;
        // Респавн в точке назначения
        this.x = this.targetX;
        this.y = this.targetY;
    }

    draw(ctx) {
        // Если мёртв — показываем таймер респавна
        if (!this.alive) {
            this.drawRespawnIndicator(ctx);
            return;
        }

        const x = this.x;
        const y = this.y;
        const r = this.radius;

        // Тень
        ctx.beginPath();
        ctx.ellipse(x, y + r, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fill();

        // Индикатор радиуса атаки
        ctx.beginPath();
        ctx.arc(x, y, this.range, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 212, 59, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Тело героя
        const bounce = Math.sin(this.walkAnimation * 0.3) * 2;
        ctx.beginPath();
        ctx.arc(x, y - bounce, r + this.attackAnimation * 0.3, 0, Math.PI * 2);

        const gradient = ctx.createRadialGradient(x - 3, y - 3 - bounce, 0, x, y - bounce, r);
        gradient.addColorStop(0, '#ffec99');
        gradient.addColorStop(1, this.color);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = '#fab005';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Корона героя
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👑', x, y - r - 8);

        // Иконка
        ctx.font = '16px Arial';
        ctx.fillText('🦸', x, y - bounce);

        // Полоска здоровья
        const hpWidth = r * 2.5;
        const hpHeight = 5;
        const hpX = x - hpWidth / 2;
        const hpY = y - r - 20;

        // Фон
        ctx.fillStyle = '#333';
        ctx.fillRect(hpX, hpY, hpWidth, hpHeight);

        // Здоровье
        const hpPercent = this.hp / this.maxHp;
        const hpColor = hpPercent > 0.5 ? '#51cf66' : hpPercent > 0.25 ? '#fcc419' : '#ff6b6b';
        ctx.fillStyle = hpColor;
        ctx.fillRect(hpX, hpY, hpWidth * hpPercent, hpHeight);

        // Рамка
        ctx.strokeStyle = '#fab005';
        ctx.lineWidth = 2;
        ctx.strokeRect(hpX, hpY, hpWidth, hpHeight);
    }

    drawRespawnIndicator(ctx) {
        const x = this.targetX;
        const y = this.targetY;

        // Пульсирующий круг
        const pulse = Math.sin(Date.now() / 200) * 5 + 20;
        ctx.beginPath();
        ctx.arc(x, y, pulse, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 212, 59, 0.2)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 212, 59, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Таймер
        const seconds = Math.ceil(this.respawnTimer / 60);
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffd43b';
        ctx.fillText(`⏱${seconds}s`, x, y);
    }

    drawMoveIndicator(ctx) {
        // Показать точку назначения если движется
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
            ctx.beginPath();
            ctx.arc(this.targetX, this.targetY, 8, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 212, 59, 0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
}
