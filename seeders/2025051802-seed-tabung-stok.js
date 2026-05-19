'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = await queryInterface.sequelize.query(
      `SELECT jenis FROM TabungStoks`
    );
    const existingJenis = existing[0].map(r => r.jenis);

    const data = [
      { jenis: '3Kg', jumlah_isi: 140, jumlah_kosong: 20 },
      { jenis: '5Kg', jumlah_isi: 18, jumlah_kosong: 2 },
      { jenis: '12Kg', jumlah_isi: 5, jumlah_kosong: 0 }
    ];

    for (const d of data) {
      if (existingJenis.includes(d.jenis)) {
        await queryInterface.sequelize.query(
          `UPDATE TabungStoks SET jumlah_isi = ${d.jumlah_isi}, jumlah_kosong = ${d.jumlah_kosong}, updatedAt = NOW() WHERE jenis = '${d.jenis}'`
        );
      } else {
        await queryInterface.bulkInsert('TabungStoks', [{
          ...d,
          createdAt: new Date(),
          updatedAt: new Date()
        }]);
      }
    }

    const produkMap = { '3Kg': 'Gas LPG 3Kg', '5Kg': 'Gas LPG 5Kg', '12Kg': 'Gas LPG 12Kg' };
    for (const [jenis, nama] of Object.entries(produkMap)) {
      await queryInterface.sequelize.query(
        `UPDATE Produks SET stok = (SELECT jumlah_isi FROM TabungStoks WHERE jenis = '${jenis}') WHERE nama LIKE '%${jenis}%'`
      );
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('TabungStoks', null, {});
  }
};
