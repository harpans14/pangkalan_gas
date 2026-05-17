'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('LogTabungs', {
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
      jumlah_tabung: {
        type: Sequelize.INTEGER,
        allowNull: false
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
    await queryInterface.dropTable('LogTabungs');
  }
};
