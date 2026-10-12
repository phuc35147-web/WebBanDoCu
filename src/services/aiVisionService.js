const fs = require('fs');
const path = require('path');

const CATEGORIES = [
    { id: 1, name: 'Điện thoại', keywords: ['iphone', 'samsung', 'xiaomi', 'oppo', 'phone', 'điện thoại'] },
    { id: 2, name: 'Laptop', keywords: ['macbook', 'dell', 'thinkpad', 'laptop', 'asus', 'hp', 'lenovo'] },
    { id: 3, name: 'Đồ điện tử', keywords: ['tai nghe', 'airpods', 'sony', 'loa', 'máy ảnh', 'camera', 'sound', 'headphone'] },
    { id: 4, name: 'Đồ gia dụng', keywords: ['nồi', 'quạt', 'bếp', 'máy giặt', 'tủ lạnh', 'lò vi sóng', 'máy lọc'] },
    { id: 5, name: 'Thời trang', keywords: ['áo', 'quần', 'giày', 'túi xách', 'sneaker', 'balo', 'đồng hồ'] },
    { id: 6, name: 'Xe cộ', keywords: ['xe máy', 'xe đạp', 'honda', 'yamaha', 'vision', 'wave', 'sh', 'vespa'] },
    { id: 7, name: 'Nội thất', keywords: ['bàn', 'ghế', 'tủ', 'giường', 'sofa', 'kệ'] },
    { id: 8, name: 'Sách', keywords: ['sách', 'truyện', 'giáo trình', 'tiểu thuyết'] },
    { id: 9, name: 'Khác', keywords: [] },
];

/**
 * Trợ lý AI Vision hỗ trợ nhận diện món đồ cũ từ ảnh tải lên.
 * Hỗ trợ Gemini API khi có GEMINI_API_KEY, kèm fallback thông minh khi chạy offline/chưa cấu hình key.
 */
async function analyzeProductImage(imagePath) {
    if (!fs.existsSync(imagePath)) {
        throw new Error('Không tìm thấy file ảnh để phân tích.');
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
        try {
            const buffer = fs.readFileSync(imagePath);
            const base64Image = buffer.toString('base64');
            const mimeType = imagePath.endsWith('.png') ? 'image/png' : imagePath.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

            const prompt = `Bạn là trợ lý thẩm định chuyên nghiệp cho sàn giao dịch đồ cũ Chợ Đồ Cũ Việt Nam.
Hãy quan sát bức ảnh món đồ cũ này và trích xuất thông tin JSON chuẩn theo định dạng sau:
{
  "tenSanPham": "Tên sản phẩm ngắn gọn, chuẩn xác kèm đời máy/thương hiệu nếu có (VD: iPhone 12 Pro Max 128GB)",
  "danhMucGoiY": 1, // Mã số 1 (Điện thoại), 2 (Laptop), 3 (Đồ điện tử), 4 (Đồ gia dụng), 5 (Thời trang), 6 (Xe cộ), 7 (Nội thất), 8 (Sách), 9 (Khác)
  "giaGoiY": 2500000, // Giá bán đồ cũ thị trường hợp lý ước tính (VND, số nguyên)
  "tinhTrang": "Đã qua sử dụng (còn tốt)", // Chọn 1 trong 4: "Mới 99%", "Đã qua sử dụng (còn tốt)", "Cũ / Có trầy xước", "Hỏng nhẹ / Cần sửa chữa"
  "moTa": "Mô tả chi tiết tình trạng ngoại hình, màu sắc, phụ kiện đi kèm theo ảnh."
}
CHỈ TRẢ VỀ DUY NHẤT CHUỖI JSON HỢP LỆ, KHÔNG CÓ MARKDOWN HOẶC GIẢI THÍCH NÀO KHÁC.`;

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: prompt },
                                {
                                    inlineData: {
                                        mimeType,
                                        data: base64Image,
                                    },
                                },
                            ],
                        },
                    ],
                }),
            });

            if (res.ok) {
                const data = await res.json();
                const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return {
                        tenSanPham: parsed.tenSanPham || 'Sản phẩm đồ cũ',
                        maDanhMuc: Number(parsed.danhMucGoiY) || 1,
                        giaGoiY: Number(parsed.giaGoiY) || 500000,
                        tinhTrang: parsed.tinhTrang || 'Đã qua sử dụng (còn tốt)',
                        moTa: parsed.moTa || 'Món đồ còn dùng tốt, ngoại hình ổn định như trong ảnh.',
                        aiPowered: true,
                    };
                }
            }
        } catch (err) {
            console.warn('Gemini Vision API không khả dụng, chuyển sang chế độ phân tích thông minh dự phòng:', err.message);
        }
    }

    // Chế độ phân tích dự phòng (Smart Heuristic Fallback khi chưa có API key)
    const fileName = path.basename(imagePath).toLowerCase();
    let matchedCat = CATEGORIES[0];
    for (const cat of CATEGORIES) {
        if (cat.keywords.some((k) => fileName.includes(k))) {
            matchedCat = cat;
            break;
        }
    }

    return {
        tenSanPham: `Sản phẩm ${matchedCat.name} (Tự động nhận diện)`,
        maDanhMuc: matchedCat.id,
        giaGoiY: matchedCat.id === 1 ? 4500000 : matchedCat.id === 2 ? 8500000 : 800000,
        tinhTrang: 'Đã qua sử dụng (còn tốt)',
        moTa: `Sản phẩm ${matchedCat.name} đã qua sử dụng, ngoại hình còn đẹp như ảnh chụp. Đầy đủ chức năng, hoạt động bình thường. Mua bán trực tiếp test thoải mái.`,
        aiPowered: false,
        note: 'Gợi ý tự động từ AI. Bạn có thể chỉnh sửa lại giá và mô tả trước khi đăng.',
    };
}

module.exports = {
    analyzeProductImage,
};
