// Approximate district-headquarters coordinates [lat, lon] for Pakistan.
// Used as an offline fallback to name the nearest district when reverse
// geocoding is unavailable. Not survey-grade; good to roughly ±30 km.
export const PROVINCES = {
  Punjab: "پنجاب",
  Sindh: "سندھ",
  "Khyber Pakhtunkhwa": "خیبر پختونخوا",
  Balochistan: "بلوچستان",
  "Gilgit-Baltistan": "گلگت بلتستان",
  "Azad Kashmir": "آزاد کشمیر",
  Islamabad: "اسلام آباد",
};

export const DISTRICTS = {
  Punjab: {
    Lahore: [31.55, 74.34], Kasur: [31.12, 74.45], Okara: [30.81, 73.45], Sahiwal: [30.67, 73.11],
    Pakpattan: [30.34, 73.39], Faisalabad: [31.42, 73.08], Jhang: [31.27, 72.32], "Toba Tek Singh": [30.97, 72.48],
    Sargodha: [32.08, 72.67], Khushab: [32.3, 72.35], "Mandi Bahauddin": [32.58, 73.49], Gujranwala: [32.16, 74.19],
    Sialkot: [32.49, 74.53], Gujrat: [32.57, 74.08], Sheikhupura: [31.71, 73.98], "Nankana Sahib": [31.45, 73.71],
    Hafizabad: [32.07, 73.69], Narowal: [32.1, 74.87], Multan: [30.2, 71.47], Khanewal: [30.3, 71.93],
    Vehari: [30.04, 72.35], Lodhran: [29.54, 71.63], Bahawalpur: [29.4, 71.68], Bahawalnagar: [29.99, 73.25],
    "Rahim Yar Khan": [28.42, 70.3], "Dera Ghazi Khan": [30.05, 70.63], Muzaffargarh: [30.07, 71.19],
    Layyah: [30.96, 70.94], Rajanpur: [29.1, 70.33], Bhakkar: [31.63, 71.07], Mianwali: [32.58, 71.54],
    Rawalpindi: [33.6, 73.05], Attock: [33.77, 72.36], Chakwal: [32.93, 72.86], Jhelum: [32.93, 73.73],
  },
  Sindh: {
    Hyderabad: [25.4, 68.37], "Mirpur Khas": [25.53, 69.01], Sanghar: [26.05, 68.95],
    "Shaheed Benazirabad": [26.25, 68.41], Khairpur: [27.53, 68.76], Sukkur: [27.71, 68.85], Larkana: [27.56, 68.21],
    Dadu: [26.73, 67.78], Ghotki: [28.01, 69.32], Jacobabad: [28.28, 68.44], Thatta: [24.75, 67.92],
    Badin: [24.66, 68.84], "Tando Allahyar": [25.46, 68.72], Umerkot: [25.36, 69.74], Matiari: [25.6, 68.45],
    Karachi: [24.86, 67.01], Tharparkar: [24.74, 69.8],
  },
  "Khyber Pakhtunkhwa": {
    Peshawar: [34.01, 71.58], Mardan: [34.2, 72.05], Charsadda: [34.15, 71.74], Swabi: [34.12, 72.47],
    Nowshera: [34.02, 71.98], Swat: [34.78, 72.36], "Dera Ismail Khan": [31.83, 70.9], Bannu: [32.99, 70.6],
    Kohat: [33.59, 71.44], Abbottabad: [34.15, 73.21], Mansehra: [34.33, 73.2], Haripur: [33.99, 72.93],
    "Lakki Marwat": [32.61, 70.91],
  },
  Balochistan: {
    Quetta: [30.18, 67.0], Pishin: [30.58, 67.0], "Killa Saifullah": [30.7, 68.36], Loralai: [30.37, 68.6],
    Zhob: [31.34, 69.45], Mastung: [29.8, 66.84], Kalat: [29.03, 66.59], Naseerabad: [28.55, 68.22],
    Jaffarabad: [28.37, 68.35], Kech: [26.0, 63.05], Lasbela: [25.81, 66.62], Kharan: [28.58, 65.42],
    Chagai: [28.89, 64.41],
  },
  "Gilgit-Baltistan": { Gilgit: [35.92, 74.31], Skardu: [35.3, 75.63], Hunza: [36.32, 74.66], Ghizer: [36.17, 73.76] },
  "Azad Kashmir": { Muzaffarabad: [34.37, 73.47], Mirpur: [33.15, 73.75], Bagh: [33.98, 73.78], Poonch: [33.86, 73.76] },
  Islamabad: { Islamabad: [33.69, 73.05] },
};

export function nearestDistrict(lat, lon) {
  const R = 6371, rad = (x) => (x * Math.PI) / 180;
  let best = null;
  for (const [province, list] of Object.entries(DISTRICTS)) {
    for (const [district, [a, b]] of Object.entries(list)) {
      const dLat = rad(a - lat), dLon = rad(b - lon);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(a)) * Math.sin(dLon / 2) ** 2;
      const km = 2 * R * Math.asin(Math.sqrt(h));
      if (!best || km < best.km) best = { district, province, km };
    }
  }
  return best && best.km <= 120 ? best : null;
}

export function allDistricts() {
  return Object.entries(DISTRICTS).flatMap(([province, list]) =>
    Object.entries(list).map(([district, [lat, lon]]) => ({ district, province, lat, lon }))
  );
}
