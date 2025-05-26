const express = require("express");
const Voucher = require("../models/Voucher");
const validationsController = require("../controllers/validationsController");

const voucherController = {};

voucherController.countDocuments = (criteria = {}) => {
  return Voucher.countDocuments(criteria).exec();
};

voucherController.getVouchers = async (criteria = {}) => {
  const vouchers = await Voucher.find(criteria).exec();
  if (!vouchers || vouchers.length === 0) {
    throw new Error("No vouchers found.");
  }
  return vouchers;
};

voucherController.getVoucher = async (criteria = {}) => {
  const voucher = await Voucher.findOne(criteria).exec();
  if (!voucher) {
    throw new Error("Voucher not found.");
  }
  return voucher;
};

voucherController.createVoucher = async (voucherData) => {
  try {
    // Set expiration date to one month from now if not provided
    if (!voucherData.expirationDate) {
      const today = new Date();
      const oneMonthFromNow = new Date(today);
      oneMonthFromNow.setMonth(today.getMonth() + 1);
      voucherData.expirationDate = oneMonthFromNow;
    }

    let voucher = new Voucher(voucherData);
    await voucher.save();
    return voucher;
  } catch (error) {
    throw new Error("Error creating voucher: " + error.message);
  }
};

voucherController.updateVoucher = async (id, voucherData) => {
  try {
    const voucher = await validationsController.validateAndFetchById(id, Voucher, "Voucher not found.");

    // Only update the isActive status
    if (voucherData.isActive !== undefined) {
      voucher.isActive = voucherData.isActive;
    }

    await voucher.save();
    return voucher;
  } catch (error) {
    throw new Error("Error updating voucher: " + error.message);
  }
};

module.exports = voucherController;
