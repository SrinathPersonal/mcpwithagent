const XLSX = require("xlsx");
const fs = require("fs");

try {
    const ws = XLSX.utils.json_to_sheet([
        { id: 1, name: "Product A", price: 100 },
        { id: 2, name: "Product B", price: 150 },
        { id: 3, name: "Product C", price: 200 }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "sample_data.xlsx");
    console.log("SUCCESS: sample_data.xlsx created.");
} catch (err) {
    console.error("FAILURE: " + err.message);
    process.exit(1);
}
