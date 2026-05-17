'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('admin123', 10);

    await queryInterface.bulkInsert('Users', [
      {
        username: 'admin',
        password: hashedPassword,
        no_ktp: '0000000000000000',
        role: 'pangkalan',
        sub_role: 'none',
        alamat: 'Pangkalan Gas Utama',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});

    const [admin] = await queryInterface.sequelize.query(
      `SELECT id FROM Users WHERE username = 'admin' LIMIT 1;`
    );
    const adminId = admin[0].id;

    await queryInterface.bulkInsert('Produks', [
      {
        nama: 'Gas LPG 3Kg',
        harga: 20000,
        stok: 100,
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nama: 'Gas LPG 5Kg',
        harga: 50000,
        stok: 50,
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nama: 'Gas LPG 12Kg',
        harga: 120000,
        stok: 20,
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Produks', null, {});
    await queryInterface.bulkDelete('Users', null, {});
  }
};
