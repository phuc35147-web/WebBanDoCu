/* =========================================================
   MIGRATION 7 TÍNH NĂNG NÂNG CẤP MỚI
   1. eKYC xác minh danh tính người bán (CCCD + Tích xanh)
   2. Hệ thống đánh giá 2 chiều (Buyer <-> Seller)
   3. Gói đẩy tin VIP & Tin nổi bật
   4. Banner quảng cáo slider & vị trí tài trợ
   5. Trợ lý AI Vision hỗ trợ đăng tin
   6. Hỗ trợ video ngắn sản phẩm
   7. Đăng nhập mạng xã hội (Google & Apple ID)
   ========================================================= */
USE WebBanDoCu;
GO

/* 1. Bảng YeuCauXacMinh (eKYC) */
IF OBJECT_ID(N'dbo.YeuCauXacMinh', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.YeuCauXacMinh (
        MaYeuCau INT IDENTITY(1,1) PRIMARY KEY,
        MaNguoiDung INT NOT NULL,
        HoTen NVARCHAR(150) NOT NULL,
        SoCCCD VARCHAR(30) NOT NULL,
        AnhMatTruoc VARCHAR(500) NOT NULL,
        AnhMatSau VARCHAR(500) NOT NULL,
        TrangThai NVARCHAR(30) NOT NULL DEFAULT N'Chờ duyệt',
        LyDoTuChoi NVARCHAR(500) NULL,
        NgayTao DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        NgayXuLy DATETIME2 NULL,
        CONSTRAINT FK_YCXM_User FOREIGN KEY(MaNguoiDung) REFERENCES dbo.NguoiDung(MaNguoiDung) ON DELETE CASCADE,
        CONSTRAINT CK_YCXM_Status CHECK(TrangThai IN (N'Chờ duyệt', N'Đã duyệt', N'Từ chối'))
    );
    CREATE INDEX IX_YCXM_User ON dbo.YeuCauXacMinh(MaNguoiDung, NgayTao DESC);
END
GO

/* 2. Bảng BannerQuangCao */
IF OBJECT_ID(N'dbo.BannerQuangCao', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BannerQuangCao (
        MaBanner INT IDENTITY(1,1) PRIMARY KEY,
        TieuDe NVARCHAR(255) NOT NULL,
        HinhAnh VARCHAR(500) NOT NULL,
        LienKet VARCHAR(500) NULL,
        ViTri VARCHAR(50) NOT NULL DEFAULT 'home_slider',
        ThuTu INT NOT NULL DEFAULT 1,
        KichHoat BIT NOT NULL DEFAULT 1,
        NgayTao DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );
END
GO

/* 3. Cột Tin VIP & Video sản phẩm */
IF COL_LENGTH(N'dbo.SanPhamDoCu', N'LaTinVIP') IS NULL
    ALTER TABLE dbo.SanPhamDoCu ADD LaTinVIP BIT NOT NULL CONSTRAINT DF_SanPham_LaTinVIP DEFAULT 0 WITH VALUES;
GO
IF COL_LENGTH(N'dbo.SanPhamDoCu', N'HanTinVIP') IS NULL
    ALTER TABLE dbo.SanPhamDoCu ADD HanTinVIP DATETIME2 NULL;
GO
IF COL_LENGTH(N'dbo.SanPhamDoCu', N'VideoUrl') IS NULL
    ALTER TABLE dbo.SanPhamDoCu ADD VideoUrl VARCHAR(1000) NULL;
GO

/* 4. Cột số lượt đẩy tin người dùng & Google/Apple ID */
IF COL_LENGTH(N'dbo.NguoiDung', N'SoLuotDayTin') IS NULL
    ALTER TABLE dbo.NguoiDung ADD SoLuotDayTin INT NOT NULL CONSTRAINT DF_NguoiDung_SoLuotDayTin DEFAULT 3 WITH VALUES;
GO
IF COL_LENGTH(N'dbo.NguoiDung', N'GoogleId') IS NULL
    ALTER TABLE dbo.NguoiDung ADD GoogleId VARCHAR(100) NULL;
GO
IF COL_LENGTH(N'dbo.NguoiDung', N'AppleId') IS NULL
    ALTER TABLE dbo.NguoiDung ADD AppleId VARCHAR(100) NULL;
GO

/* 5. Cột loại đánh giá 2 chiều */
IF OBJECT_ID(N'dbo.DanhGia', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.DanhGia', N'LoaiDanhGia') IS NULL
    ALTER TABLE dbo.DanhGia ADD LoaiDanhGia VARCHAR(30) NOT NULL CONSTRAINT DF_DanhGia_Loai DEFAULT 'buyer_to_seller' WITH VALUES;
GO

PRINT N'Hoàn tất migration 7 tính năng nâng cấp mới.';
GO
