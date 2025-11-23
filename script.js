/* script.js */

// --- KONFIGURASI LISENSI ---
const LICENSE_KEY_STORAGE = "ksp_license_key";
const VALID_LICENSE = "Yuma123"; // Kode rahasia (bisa diubah via admin)

function checkLicense() {
    const currentKey = localStorage.getItem(LICENSE_KEY_STORAGE);
    const modal = document.getElementById('licenseModal');
    
    // Cek apakah kita di halaman admin
    if (window.location.pathname.includes('admin_license.html')) return;

    if (currentKey !== VALID_LICENSE) {
        if(modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Disable scroll
        }
    }
}

// Fungsi Toggle Menu Hamburger
function toggleMenu() {
    const menu = document.getElementById('navMenu');
    menu.classList.toggle('active');
}

// --- DATA HANDLER ---
function getData(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// --- HELPER: Format Rupiah ---
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(angka);
}

// --- LOGIKA HALAMAN ---

document.addEventListener('DOMContentLoaded', () => {
    checkLicense(); // Cek lisensi saat load
    
    const path = window.location.pathname;

    // 1. Halaman Tambah Nasabah & Data Nasabah (index.html / tambah_nasabah.html)
    if (document.getElementById('formTambahNasabah')) {
        document.getElementById('formTambahNasabah').addEventListener('submit', (e) => {
            e.preventDefault();
            const nasabah = getData('nasabah');
            const newNasabah = {
                id: Date.now(),
                nama: document.getElementById('nama').value,
                usaha: document.getElementById('usaha').value,
                tempat: document.getElementById('tempat').value,
                alamat: document.getElementById('alamat').value,
                hp: document.getElementById('hp').value
            };
            nasabah.push(newNasabah);
            saveData('nasabah', nasabah);
            alert('Nasabah Berhasil Ditambahkan!');
            window.location.href = 'index.html'; // Redirect ke list
        });
    }

    if (document.getElementById('tabelNasabah')) {
        loadNasabahTable();
        document.getElementById('searchNasabah').addEventListener('input', (e) => loadNasabahTable(e.target.value));
    }

    // 2. Halaman Tambah Pinjaman
    if (document.getElementById('formTambahPinjaman')) {
        populateNasabahSelect();
        setupAutoCalculations();
        
        document.getElementById('formTambahPinjaman').addEventListener('submit', (e) => {
            e.preventDefault();
            simpanPinjaman();
        });
    }

    // 3. Halaman Data Pinjaman
    if (document.getElementById('containerPinjaman')) {
        loadPinjamanCards();
        document.getElementById('searchPinjaman').addEventListener('input', (e) => loadPinjamanCards(e.target.value));
    }

    // 4. Halaman Pembayaran
    if (document.getElementById('btnCariBayar')) {
        document.getElementById('btnCariBayar').addEventListener('click', cariTagihanNasabah);
        document.getElementById('btnProsesBayar').addEventListener('click', prosesPembayaran);
    }

    // 5. Halaman Tabungan
    if (document.getElementById('tabelTabungan')) {
        loadTabungan();
    }

    // 6. Halaman Saldo
    if (document.getElementById('saldoPinjaman')) {
        loadRekapanSaldo();
    }

    // 7. Halaman Bukti
    if (document.getElementById('tabelBukti')) {
        loadBukti();
        document.getElementById('searchBukti').addEventListener('input', (e) => loadBukti(e.target.value));
    }
});

// --- FUNGSI SPESIFIK ---

function loadNasabahTable(search = '') {
    const tbody = document.getElementById('tabelNasabah').querySelector('tbody');
    const data = getData('nasabah');
    tbody.innerHTML = '';
    
    let no = 1;
    data.filter(n => n.nama.toLowerCase().includes(search.toLowerCase())).forEach(n => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${no++}</td>
            <td>${n.nama}</td>
            <td>${n.usaha}</td>
            <td>${n.tempat}</td>
            <td>${n.alamat}</td>
            <td>${n.hp}</td>
            <td>
                <button class="btn-action btn-delete" onclick="hapusNasabah(${n.id})">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function hapusNasabah(id) {
    if(confirm('Hapus data nasabah ini?')) {
        let data = getData('nasabah');
        data = data.filter(n => n.id !== id);
        saveData('nasabah', data);
        loadNasabahTable();
    }
}

function populateNasabahSelect() {
    const select = document.getElementById('namaNasabah');
    const data = getData('nasabah');
    data.forEach(n => {
        const opt = document.createElement('option');
        opt.value = n.nama;
        opt.textContent = n.nama;
        select.appendChild(opt);
    });
}

function setupAutoCalculations() {
    const pokok = document.getElementById('pokok');
    const jasaPersen = document.getElementById('jasa');
    const tabunganPersen = document.getElementById('tabungan');
    const adminPersen = document.getElementById('admin');
    const angsuran = document.getElementById('jmlAngsuran');

    function calc() {
        let p = parseFloat(pokok.value) || 0;
        let j = parseFloat(jasaPersen.value) || 0;
        let t = parseFloat(tabunganPersen.value) || 0;
        let a = parseFloat(adminPersen.value) || 0;
        let ang = parseFloat(angsuran.value) || 1;

        let nominalJasa = p * (j / 100);
        let totalBayar = p + nominalJasa;
        let nominalCicilan = totalBayar / ang;
        
        let nominalTabungan = p * (t / 100);
        let nominalAdmin = p * (a / 100);
        let diterima = p - (nominalTabungan + nominalAdmin);

        document.getElementById('totalBayar').value = totalBayar;
        document.getElementById('nominalCicilan').value = Math.ceil(nominalCicilan); // Pembulatan
        document.getElementById('uangDiterima').value = diterima;
        document.getElementById('nominalTabunganHidden').value = nominalTabungan; // Hidden input untuk simpan
    }

    [pokok, jasaPersen, tabunganPersen, adminPersen, angsuran].forEach(el => {
        el.addEventListener('input', calc);
    });
}

function simpanPinjaman() {
    const pinjaman = {
        id: Date.now(),
        tanggal: document.getElementById('tanggal').value,
        nama: document.getElementById('namaNasabah').value,
        ke: document.getElementById('pinjamanKe').value,
        pokok: parseFloat(document.getElementById('pokok').value),
        totalBayar: parseFloat(document.getElementById('totalBayar').value),
        sisaBayar: parseFloat(document.getElementById('totalBayar').value),
        cicilanTipe: document.getElementById('tipeCicilan').value,
        jmlAngsuran: parseInt(document.getElementById('jmlAngsuran').value),
        sisaAngsuran: parseInt(document.getElementById('jmlAngsuran').value),
        nominalCicilan: parseFloat(document.getElementById('nominalCicilan').value),
        tabunganMasuk: parseFloat(document.getElementById('nominalTabunganHidden').value)
    };

    // Simpan Pinjaman
    let dataPinjaman = getData('pinjaman');
    dataPinjaman.push(pinjaman);
    saveData('pinjaman', dataPinjaman);

    // Auto Update Tabungan
    let dataTabungan = getData('tabungan');
    let existingTab = dataTabungan.find(t => t.nama === pinjaman.nama);
    if (existingTab) {
        existingTab.total += pinjaman.tabunganMasuk;
    } else {
        dataTabungan.push({ id: Date.now(), nama: pinjaman.nama, total: pinjaman.tabunganMasuk });
    }
    saveData('tabungan', dataTabungan);

    alert('Pinjaman Berhasil Disimpan!');
    window.location.href = 'pinjaman.html';
}

function loadPinjamanCards(search = '') {
    const container = document.getElementById('containerPinjaman');
    const data = getData('pinjaman');
    container.innerHTML = '';

    data.filter(p => p.nama.toLowerCase().includes(search.toLowerCase())).forEach(p => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <h3>${p.nama}</h3>
            <p><strong>Pinjaman Ke:</strong> ${p.ke}</p>
            <p><strong>Pokok:</strong> ${formatRupiah(p.pokok)}</p>
            <p><strong>Sisa Saldo:</strong> <span style="color:red">${formatRupiah(p.sisaBayar)}</span></p>
            <p><strong>Sisa Angsuran:</strong> ${p.sisaAngsuran}x (${p.cicilanTipe})</p>
            <p><strong>Nominal Cicilan:</strong> ${formatRupiah(p.nominalCicilan)}</p>
            <hr style="margin:10px 0">
            ${p.sisaBayar <= 0 ? '<span class="badge" style="background:#198754; color:white">LUNAS</span> <button class="btn-action btn-delete" onclick="hapusPinjaman('+p.id+')">Hapus</button>' : '<span class="badge">BELUM LUNAS</span>'}
        `;
        container.appendChild(div);
    });
}

function hapusPinjaman(id) {
    if(confirm('Hapus data pinjaman ini?')) {
        let data = getData('pinjaman');
        data = data.filter(p => p.id !== id);
        saveData('pinjaman', data);
        loadPinjamanCards();
    }
}

function cariTagihanNasabah() {
    const nama = document.getElementById('cariNamaBayar').value;
    const data = getData('pinjaman');
    const target = data.find(p => p.nama.toLowerCase() === nama.toLowerCase() && p.sisaBayar > 0);

    const resultDiv = document.getElementById('hasilCariBayar');
    if (target) {
        resultDiv.style.display = 'block';
        document.getElementById('labelNama').textContent = target.nama;
        document.getElementById('labelSisa').textContent = formatRupiah(target.sisaBayar);
        document.getElementById('labelAngsuran').textContent = target.sisaAngsuran;
        document.getElementById('inputBayar').value = target.nominalCicilan; // Default bayar 1 cicilan
        document.getElementById('btnProsesBayar').dataset.id = target.id;
    } else {
        resultDiv.style.display = 'none';
        alert('Data tidak ditemukan atau sudah lunas.');
    }
}

function prosesPembayaran() {
    const id = parseInt(document.getElementById('btnProsesBayar').dataset.id);
    const bayar = parseFloat(document.getElementById('inputBayar').value);
    
    let dataPinjaman = getData('pinjaman');
    let targetIndex = dataPinjaman.findIndex(p => p.id === id);
    
    if (targetIndex !== -1) {
        // Update Pinjaman
        dataPinjaman[targetIndex].sisaBayar -= bayar;
        if(dataPinjaman[targetIndex].sisaBayar < 0) dataPinjaman[targetIndex].sisaBayar = 0;
        dataPinjaman[targetIndex].sisaAngsuran -= 1;
        if(dataPinjaman[targetIndex].sisaAngsuran < 0) dataPinjaman[targetIndex].sisaAngsuran = 0;
        
        saveData('pinjaman', dataPinjaman);

        // Simpan Bukti
        const now = new Date();
        const bukti = {
            id: Date.now(),
            nama: dataPinjaman[targetIndex].nama,
            jumlah: bayar,
            tanggal: now.toLocaleDateString('id-ID'),
            waktu: now.toLocaleTimeString('id-ID')
        };
        let dataBukti = getData('bukti');
        dataBukti.push(bukti);
        saveData('bukti', dataBukti);

        alert('Pembayaran Berhasil!');
        window.location.reload();
    }
}

function loadTabungan() {
    const tbody = document.getElementById('tabelTabungan').querySelector('tbody');
    const data = getData('tabungan');
    tbody.innerHTML = '';
    
    let no = 1;
    data.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${no++}</td>
            <td>${t.nama}</td>
            <td>${formatRupiah(t.total)}</td>
            <td>
                <button class="btn-action btn-delete" onclick="resetTabungan(${t.id})">Ambil/Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function resetTabungan(id) {
    if(confirm('Apakah tabungan ini diambil? Data akan dihapus.')) {
        let data = getData('tabungan');
        data = data.filter(t => t.id !== id);
        saveData('tabungan', data);
        loadTabungan();
    }
}

function loadRekapanSaldo() {
    const pinjaman = getData('pinjaman');
    const tabungan = getData('tabungan');
    const bukti = getData('bukti');

    let totalPinjamanDiputar = pinjaman.reduce((acc, curr) => acc + curr.pokok, 0);
    let totalYangHarusKembali = pinjaman.reduce((acc, curr) => acc + curr.totalBayar, 0);
    let sisaPiutang = pinjaman.reduce((acc, curr) => acc + curr.sisaBayar, 0);
    let totalTabungan = tabungan.reduce((acc, curr) => acc + curr.total, 0);
    let totalUangMasuk = bukti.reduce((acc, curr) => acc + curr.jumlah, 0);

    document.getElementById('saldoPinjaman').textContent = formatRupiah(totalPinjamanDiputar);
    document.getElementById('saldoPiutang').textContent = formatRupiah(sisaPiutang);
    document.getElementById('saldoTabungan').textContent = formatRupiah(totalTabungan);
    document.getElementById('saldoMasuk').textContent = formatRupiah(totalUangMasuk);
}

function loadBukti(search = '') {
    const tbody = document.getElementById('tabelBukti').querySelector('tbody');
    const data = getData('bukti');
    tbody.innerHTML = ''; // Clear existing rows

    // Sort by newest first
    data.sort((a, b) => b.id - a.id);

    data.filter(b => b.nama.toLowerCase().includes(search.toLowerCase())).forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${b.tanggal}</td>
            <td>${b.waktu}</td>
            <td>${b.nama}</td>
            <td>${formatRupiah(b.jumlah)}</td>
            <td><span class="badge" style="background:#198754; color:white">LUNAS/BAYAR</span></td>
        `;
        tbody.appendChild(tr);
    });
}
