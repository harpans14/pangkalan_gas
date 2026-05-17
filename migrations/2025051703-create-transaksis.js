'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Transaksis', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'NO ACTION'
      },
      produk_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Produks',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      jumlah_beli: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      metode: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.ENUM('pending', 'ACC', 'ditolak', 'disetujui', 'selesai'),
        defaultValue: 'pending'
      },
      tanda_tangan: {
        type: Sequelize.TEXT
      },
      tanggal: {
        type: Sequelize.DATE
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Transaksis');
  }
};
