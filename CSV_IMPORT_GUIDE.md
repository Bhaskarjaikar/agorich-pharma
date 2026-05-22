# CSV Import Guide for Inventory Management

## Overview
This guide explains how to import products into your Agorich Pharma inventory using CSV files.

## CSV Format

### Required Columns
Your CSV file must include these columns (case-insensitive):

1. **name** - Product name (required, text)
2. **stock** - Stock quantity (required, number)
3. **mrp** - Maximum Retail Price in ₹ (required, number)
4. **agorich_price** - Agorich selling price in ₹ (required, number)
5. **pack_size** - Package size (e.g., "10 tablets", "100ml")
6. **batch_number** - Batch/Lot number
7. **expiry_date** - Expiry date (format: YYYY-MM or MM-YYYY or DD-MM-YYYY)
8. **mfg** - Manufacturer name or code

### Sample CSV Format
```csv
name,stock,mrp,agorich_price,pack_size,batch_number,expiry_date,mfg
Paracetamol 500mg,100,50,30,10 tablets,BATCH001,2025-12,Cipla
Amoxicillin 250mg,50,120,72,10 capsules,BATCH002,2026-06,Sun Pharma
Cetirizine 10mg,200,25,15,10 tablets,BATCH003,2025-09,Dr Reddy's
```

## How to Import

1. **Prepare your CSV file**
   - Ensure all required columns are present
   - Use comma (`,`) as separator
   - First row should contain column headers
   - Product names should be unique

2. **Download Sample CSV**
   - Click "Download Sample CSV" button in the Inventory Management section
   - Use this as a template for your data

3. **Import Process**
   - Go to Admin Dashboard → Inventory Management
   - Click "Import CSV" button
   - Select your CSV file
   - Wait for the import to complete
   - Success message will show how many products were imported

## Important Notes

### Margin Calculation
- Margin is automatically calculated: `((MRP - Agorich Price) / MRP) × 100`
- Example: If MRP = ₹50 and Agorich Price = ₹30, Margin = 40%

### Date Formats Supported
- `YYYY-MM` (e.g., 2025-12)
- `MM-YYYY` (e.g., 12-2025)
- `DD-MM-YYYY` (e.g., 31-12-2025)
- `YYYY-MM-DD` (e.g., 2025-12-31)

### Validation Rules
- Product name cannot be empty
- Stock must be 0 or positive
- MRP and Agorich Price must be greater than 0
- Batch number and pack size are recommended but optional in import
- Expiry date is validated and normalized

## Troubleshooting

### "Import chunk failed" Error
**Solution**: This is now fixed! The system uses proper CSV parsing with papaparse library.

### "No valid rows found"
**Possible causes**:
- CSV file is empty
- No products have names filled in
- First row doesn't contain headers

**Solution**: Check that your CSV has headers and at least one product with a name.

### "Failed to import"
**Possible causes**:
- Missing required columns
- Invalid data format (e.g., text in number fields)
- Database constraint violations

**Solution**: 
- Verify all required columns exist
- Check that numbers are valid
- Ensure expiry dates are in correct format
- Review error message for specific details

### Import Partially Succeeds
**What happens**: 
- Import stops at the first error
- Products before the error are saved
- Products after the error are not imported

**Solution**: 
- Fix the problematic row in your CSV
- Remove successfully imported products
- Re-import the corrected CSV

## Tips for Successful Import

1. **Test with small batches first** - Try importing 5-10 products before bulk import
2. **Use the sample CSV** - Download and modify it to ensure correct format
3. **Check your data** - Verify all required fields are filled
4. **Backup existing data** - Export current inventory before bulk import
5. **Validate numbers** - Ensure prices and stock are valid numbers without currency symbols

## Getting Help

If you encounter issues:
1. Check this guide first
2. Download and examine the sample CSV
3. Verify your CSV format matches the sample
4. Check browser console for detailed error messages
5. Contact support with error details and sample of your CSV (remove sensitive data)

## Example CSV Files

### Minimal Valid CSV
```csv
name,stock,mrp,agorich_price,pack_size,batch_number,expiry_date,mfg
Test Product,10,100,60,10 units,BATCH001,2025-12,TestMfg
```

### Complete CSV with Multiple Products
```csv
name,stock,mrp,agorich_price,pack_size,batch_number,expiry_date,mfg
Paracetamol 500mg,100,50,30,10 tablets,BATCH001,2025-12,Cipla
Amoxicillin 250mg,50,120,72,10 capsules,BATCH002,2026-06,Sun Pharma
Cetirizine 10mg,200,25,15,10 tablets,BATCH003,2025-09,Dr Reddy's
Omeprazole 20mg,75,80,48,10 capsules,BATCH004,2026-03,Lupin
Azithromycin 500mg,40,180,108,3 tablets,BATCH005,2025-11,Abbott
```

## After Import

Once products are imported:
- They appear in the inventory table
- Can be selected in "Create New Invoice" for orders
- Can be edited or deleted individually
- Stock is tracked automatically
- Low stock alerts appear when stock < 10 units

---

**Version**: 1.0  
**Last Updated**: November 2025  
**Feature Status**: ✅ Fully Working



















