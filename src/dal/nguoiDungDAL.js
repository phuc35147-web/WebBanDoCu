const { poolPromise, sql } = require('./dbConfig');
class NguoiDungDAL {
    async findById(id) {
        const p = await poolPromise;
        return (
            (
                await p
                    .request()
                    .input('id', sql.Int, Number(id))
                    .query('SELECT TOP 1 * FROM NguoiDung WHERE MaNguoiDung=@id')
            ).recordset[0] || null
        );
    }
    async findByEmail(email) {
        const p = await poolPromise;
        const r = await p
            .request()
            .input('email', sql.VarChar(255), String(email).trim().toLowerCase())
            .query('SELECT * FROM NguoiDung WHERE Email=@email');
        return r.recordset[0];
    }
    async findByPhone(phone) {
        const p = await poolPromise;
        const normalizedPhone = String(phone || '').trim();
        const r = await p
            .request()
            .input('phone', sql.VarChar(20), normalizedPhone)
            .query('SELECT * FROM NguoiDung WHERE SoDienThoai=@phone');
        return r.recordset[0];
    }
    async create(d) {
        const p = await poolPromise;
        const tx = new sql.Transaction(p);
        await tx.begin();
        try {
            const r = await tx
                .request()
                .input('otpId', sql.Int, d.otpId)
                .input('email', sql.VarChar(255), d.email.toLowerCase())
                .input('name', sql.NVarChar(150), d.hoTen)
                .input('phone', sql.VarChar(20), d.soDienThoai)
                .input('pass', sql.VarChar(255), d.matKhau)
                .input('tt', sql.NVarChar(100), d.tinhThanh)
                .input('qh', sql.NVarChar(100), d.quanHuyen)
                .input('px', sql.NVarChar(100), d.phuongXa)
                .input('dc', sql.NVarChar(255), d.diaChiChiTiet)
                .query(
                    `UPDATE EmailOtp SET ConsumedAt=SYSDATETIME() WHERE OtpId=@otpId AND Email=@email AND Purpose='register' AND VerifiedAt IS NOT NULL AND ConsumedAt IS NULL AND ExpiresAt>SYSDATETIME(); IF @@ROWCOUNT=0 THROW 50001,N'Vui lòng xác thực email trước khi đăng ký.',1; INSERT NguoiDung(HoTen,Email,SoDienThoai,MatKhau,TinhThanh,QuanHuyen,PhuongXa,DiaChiChiTiet,NgayDongYDieuKhoan) OUTPUT INSERTED.MaNguoiDung VALUES(@name,@email,@phone,@pass,@tt,@qh,@px,@dc,SYSDATETIME())`,
                );
            await tx.commit();
            return r.recordset[0];
        } catch (e) {
            try {
                await tx.rollback();
            } catch (rollbackError) {
                console.error('Registration transaction rollback failed:', rollbackError);
            }
            throw e;
        }
    }
    async resetPassword(email, otpId, hash) {
        const p = await poolPromise;
        const tx = new sql.Transaction(p);
        await tx.begin();
        try {
            const r = await tx
                .request()
                .input('otpId', sql.Int, otpId)
                .input('email', sql.VarChar(255), email)
                .input('hash', sql.VarChar(255), hash)
                .query(
                    `UPDATE EmailOtp SET ConsumedAt=SYSDATETIME() WHERE OtpId=@otpId AND Email=@email AND Purpose='reset-password' AND VerifiedAt IS NOT NULL AND ConsumedAt IS NULL AND ExpiresAt>SYSDATETIME(); IF @@ROWCOUNT=0 THROW 50001,N'Mã xác thực không hợp lệ hoặc đã hết hạn.',1; UPDATE NguoiDung SET MatKhau=@hash,NgayCapNhat=SYSDATETIME(),PasswordChangedAt=SYSUTCDATETIME() WHERE Email=@email; IF @@ROWCOUNT=0 THROW 50002,N'Không tìm thấy tài khoản.',1;`,
                );
            await tx.commit();
            return r.rowsAffected;
        } catch (e) {
            try {
                await tx.rollback();
            } catch (rollbackError) {
                console.error('Password reset transaction rollback failed:', rollbackError);
            }
            throw e;
        }
    }
    async findOrCreateSocialUser({ email, hoTen, googleId, appleId, anhDaiDien }) {
        const p = await poolPromise;
        const normalizedEmail = String(email || '').trim().toLowerCase();

        // 1. Tìm theo GoogleId / AppleId hoặc Email
        let user = null;
        if (googleId) {
            user = (
                await p
                    .request()
                    .input('gid', sql.VarChar(100), googleId)
                    .query('SELECT TOP 1 * FROM NguoiDung WHERE GoogleId=@gid')
            ).recordset[0];
        }
        if (!user && appleId) {
            user = (
                await p
                    .request()
                    .input('aid', sql.VarChar(100), appleId)
                    .query('SELECT TOP 1 * FROM NguoiDung WHERE AppleId=@aid')
            ).recordset[0];
        }
        if (!user && normalizedEmail) {
            user = (
                await p
                    .request()
                    .input('email', sql.VarChar(255), normalizedEmail)
                    .query('SELECT TOP 1 * FROM NguoiDung WHERE Email=@email')
            ).recordset[0];
        }

        if (user) {
            // Liên kết ID nếu chưa có
            const r = p.request().input('id', sql.Int, user.MaNguoiDung);
            let updates = [];
            if (googleId && !user.GoogleId) {
                updates.push('GoogleId=@gid');
                r.input('gid', sql.VarChar(100), googleId);
            }
            if (appleId && !user.AppleId) {
                updates.push('AppleId=@aid');
                r.input('aid', sql.VarChar(100), appleId);
            }
            if (anhDaiDien && !user.AnhDaiDien) {
                updates.push('AnhDaiDien=@avatar');
                r.input('avatar', sql.VarChar(500), anhDaiDien);
            }
            if (updates.length) {
                await r.query(`UPDATE NguoiDung SET ${updates.join(', ')} WHERE MaNguoiDung=@id`);
            }
            return user;
        }

        // 2. Chưa có tài khoản: Tạo mới
        const placeholderPhone = '09' + Math.floor(10000000 + Math.random() * 90000000);
        const randomPassHash = await require('bcryptjs').hash('OAuth_' + Math.random() + Date.now(), 10);
        const inserted = (
            await p
                .request()
                .input('name', sql.NVarChar(150), hoTen || 'Thành viên Chợ Đồ Cũ')
                .input('email', sql.VarChar(255), normalizedEmail)
                .input('phone', sql.VarChar(20), placeholderPhone)
                .input('pass', sql.VarChar(255), randomPassHash)
                .input('gid', sql.VarChar(100), googleId || null)
                .input('aid', sql.VarChar(100), appleId || null)
                .input('avatar', sql.VarChar(500), anhDaiDien || null)
                .query(`
                    INSERT NguoiDung(HoTen,Email,SoDienThoai,MatKhau,GoogleId,AppleId,AnhDaiDien,TinhThanh,PhuongXa,DiaChiChiTiet,NgayDongYDieuKhoan)
                    OUTPUT INSERTED.*
                    VALUES(@name,@email,@phone,@pass,@gid,@aid,@avatar,N'TP. Hồ Chí Minh',N'Chưa cập nhật',N'Chưa cập nhật',SYSDATETIME())
                `)
        ).recordset[0];
        return inserted;
    }
}
module.exports = new NguoiDungDAL();
