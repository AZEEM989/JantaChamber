// Global variables
// ...existing code...
let lifetimeRevenue = parseFloat(localStorage.getItem('lifetimeRevenue') || '0');
// ...existing code...
let records = JSON.parse(localStorage.getItem('fruitChamberRecords') || '[]');
let billCounter = parseInt(localStorage.getItem('billCounter') || '1');
let deleteRecordId = null;

// Rate per kg per month
const RATE_PER_KG_PER_MONTH = 4;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    generateBillNumber();
    updateAllStats();
    displayRecords();
    updateDashboard();
});

// Navigation functions
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected section
    document.getElementById(sectionName + '-section').classList.add('active');

    // Add active class to clicked button
    // Use event delegation to find the correct button
    if (window.event && window.event.target.classList.contains('nav-btn')) {
        window.event.target.classList.add('active');
    } else {
        // fallback: set active by sectionName
        document.querySelectorAll('.nav-btn').forEach(btn => {
            if (btn.textContent.replace(/\s/g, '').toLowerCase().includes(sectionName)) {
                btn.classList.add('active');
            }
        });
    }

    // Update content based on section
    if (sectionName === 'records') {
        displayRecords();
        updateAllStats();
    } else if (sectionName === 'dashboard') {
        updateDashboard();
    } else if (sectionName === 'boxout') {
        populateBoxOutBillNos();
        displayBoxOutHistory();
        clearBoxOutForm();
    }
}

// Generate bill number
function generateBillNumber() {
    const today = new Date();
    const dateStr = today.getFullYear().toString().substr(-2) + 
                   (today.getMonth() + 1).toString().padStart(2, '0') + 
                   today.getDate().toString().padStart(2, '0');
    const billNum = `JFC${dateStr}${billCounter.toString().padStart(3, '0')}`;
    document.getElementById('billNumber').textContent = billNum;
    return billNum;
}

// Calculate total cost based on weight and rate
function calculateTotal() {
    const quantity = parseFloat(document.getElementById('quantity').value) || 0;
    const weight = parseFloat(document.getElementById('weight').value) || 0;
    
    const totalWeight = quantity * weight;
    const monthlyCost = totalWeight * RATE_PER_KG_PER_MONTH;
    
    document.getElementById('totalWeight').value = totalWeight > 0 ? `${totalWeight.toFixed(1)} kg` : '';
    document.getElementById('total').value = monthlyCost > 0 ? `₹${monthlyCost.toFixed(2)}` : '';
    
    calculateBalance();
}

// Calculate balance
function calculateBalance() {
    const totalStr = document.getElementById('total').value.replace('₹', '');
    const total = parseFloat(totalStr) || 0;
    const paid = parseFloat(document.getElementById('paid').value) || 0;
    
    const balance = total - paid;
    document.getElementById('balance').value = balance > 0 ? `₹${balance.toFixed(2)}` : '₹0.00';
}

// Check if record is overdue (more than 1 month old)
function isOverdue(dateString) {
    const recordDate = new Date(dateString);
    const currentDate = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(currentDate.getMonth() - 1);
    
    return recordDate < oneMonthAgo;
}

// Form submission
document.getElementById('billingForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = ['name', 'mobile', 'fruit', 'weight', 'quantity'];
    let isValid = true;
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            field.classList.add('error');
            isValid = false;
        } else {
            field.classList.remove('error');
        }
    });
    
    if (!isValid) {
        showNotification('Please fill all required fields', 'error');
        return;
    }
    
    // Create record object
    const quantity = parseInt(document.getElementById('quantity').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const totalWeight = quantity * weight;
    const monthlyCost = totalWeight * RATE_PER_KG_PER_MONTH;
    const paid = parseFloat(document.getElementById('paid').value) || 0;
    const balance = monthlyCost - paid;
    
    const record = {
        id: Date.now().toString(),
        billNumber: document.getElementById('billNumber').textContent,
        date: new Date().toISOString(),
        name: document.getElementById('name').value.trim(),
        address: document.getElementById('address').value.trim(),
        mobile: document.getElementById('mobile').value.trim(),
        lotno: document.getElementById('lotno').value.trim(),
        fruit: document.getElementById('fruit').value,
        weight: weight,
        quantity: quantity,
        totalWeight: totalWeight,
        rate: RATE_PER_KG_PER_MONTH,
        monthlyCost: monthlyCost,
        paid: paid,
        balance: balance,
        notes: document.getElementById('notes').value.trim()
    };
    
    // Add to records
    records.push(record);
    // Update lifetime revenue
lifetimeRevenue += monthlyCost;
localStorage.setItem('lifetimeRevenue', lifetimeRevenue.toString());

localStorage.setItem('fruitChamberRecords', JSON.stringify(records));
// ...existing code...
    localStorage.setItem('fruitChamberRecords', JSON.stringify(records));
    
    // Increment bill counter
    billCounter++;
    localStorage.setItem('billCounter', billCounter.toString());
    
    // Show success message and bill preview
    showNotification('Bill created successfully!', 'success');
    showBillPreview(record);
    
    // Clear form and generate new bill number
    clearForm();
    generateBillNumber();
    
    // Update stats
    updateAllStats();
});

// Clear form
function clearForm() {
    document.getElementById('billingForm').reset();
    document.getElementById('totalWeight').value = '';
    document.getElementById('total').value = '';
    document.getElementById('balance').value = '';
    document.getElementById('rateDisplay').value = '₹4 per kg per month';
    
    // Remove error classes
    document.querySelectorAll('.error').forEach(field => {
        field.classList.remove('error');
    });
}

// Display records in table
function displayRecords() {
    const tbody = document.getElementById('recordsBody');
    const noRecords = document.getElementById('noRecords');
    
    if (records.length === 0) {
        tbody.innerHTML = '';
        noRecords.style.display = 'block';
        return;
    }
    
    noRecords.style.display = 'none';
    
    // Sort records by date (newest first)
    const sortedRecords = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tbody.innerHTML = sortedRecords.map(record => {
        const overdue = isOverdue(record.date);
        const rowClass = overdue ? 'overdue-row' : '';
        const statusText = overdue ? 'Overdue' : 'Active';
        const statusClass = overdue ? 'status-overdue' : 'status-active';
        
        return `
        <tr class="${rowClass}">
            <td><strong>${record.billNumber}</strong></td>
            <td>${new Date(record.date).toLocaleDateString('en-IN')}</td>
            <td>
                <div><strong>${record.name}</strong></div>
                <div style="font-size: 0.8rem; color: #666;">${record.address || 'N/A'}</div>
            </td>
            <td>${record.mobile}</td>
            <td>
                <div><strong>${record.fruit}</strong></div>
                <div style="font-size: 0.8rem; color: #666;">${record.weight}kg × ${record.quantity} boxes</div>
            </td>
            <td><strong>${Number(record.totalWeight || 0).toFixed(1)} kg</strong></td>
            <td><strong>₹${Number(record.monthlyCost || 0).toFixed(2)}</strong></td>
            <td>₹${Number(record.paid || 0).toFixed(2)}</td>
            <td style="color: ${Number(record.balance || 0) > 0 ? '#e53e3e' : '#38a169'};">
                <strong>₹${Number(record.balance || 0).toFixed(2)}</strong>
            </td>
            <td>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </td>
            <td>
                <button onclick="viewBill('${record.id}')" class="action-btn view-btn">View</button>
                <button onclick="showEditModal('${record.id}')" class="action-btn view-btn" style="background:linear-gradient(135deg,#f6e05e,#ecc94b);color:#4a5568;">Edit</button>
                <button onclick="showDeleteModal('${record.id}')" class="action-btn delete-btn">Delete</button>
            </td>
        </tr>
    `;
    }).join('');
}

// Filter records based on search
function filterRecords() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filteredRecords = records.filter(record => 
        record.name.toLowerCase().includes(searchTerm) ||
        record.mobile.includes(searchTerm) ||
        record.billNumber.toLowerCase().includes(searchTerm) ||
        record.fruit.toLowerCase().includes(searchTerm)
    );
    
    const tbody = document.getElementById('recordsBody');
    const noRecords = document.getElementById('noRecords');
    
    if (filteredRecords.length === 0) {
        tbody.innerHTML = '';
        noRecords.style.display = 'block';
        noRecords.innerHTML = '<p>No records match your search criteria.</p>';
        return;
    }
    
    noRecords.style.display = 'none';
    
    tbody.innerHTML = filteredRecords.map(record => {
        const overdue = isOverdue(record.date);
        const rowClass = overdue ? 'overdue-row' : '';
        const statusText = overdue ? 'Overdue' : 'Active';
        const statusClass = overdue ? 'status-overdue' : 'status-active';
        
        return `
        <tr class="${rowClass}">
            <td><strong>${record.billNumber}</strong></td>
            <td>${new Date(record.date).toLocaleDateString('en-IN')}</td>
            <td>
                <div><strong>${record.name}</strong></div>
                <div style="font-size: 0.8rem; color: #666;">${record.address || 'N/A'}</div>
            </td>
            <td>${record.mobile}</td>
            <td>
                <div><strong>${record.fruit}</strong></div>
                <div style="font-size: 0.8rem; color: #666;">${record.weight}kg × ${record.quantity} boxes</div>
            </td>
            <td><strong>${Number(record.totalWeight || 0).toFixed(1)} kg</strong></td>
            <td><strong>₹${Number(record.monthlyCost || 0).toFixed(2)}</strong></td>
            <td>₹${Number(record.paid || 0).toFixed(2)}</td>
            <td style="color: ${Number(record.balance || 0) > 0 ? '#e53e3e' : '#38a169'};">
                <strong>₹${Number(record.balance || 0).toFixed(2)}</strong>
            </td>
            <td>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </td>
            <td>
                <button onclick="viewBill('${record.id}')" class="action-btn view-btn">View</button>
                <button onclick="showDeleteModal('${record.id}')" class="action-btn delete-btn">Delete</button>
            </td>
        </tr>
    `;
    }).join('');
}

// Update all statistics
function updateAllStats() {
    const totalRecords = records.length;
    // Use lifetimeRevenue instead of recalculating
    const totalRevenue = lifetimeRevenue;
    const pendingAmount = records.reduce((sum, record) => sum + Number(record.balance || 0), 0);
    const overdueCount = records.filter(record => isOverdue(record.date)).length;

    document.getElementById('totalRecords').textContent = totalRecords;
    document.getElementById('totalRevenue').textContent = `₹${totalRevenue.toFixed(2)}`;
    document.getElementById('pendingAmount').textContent = `₹${pendingAmount.toFixed(2)}`;
    document.getElementById('overdueRecords').textContent = overdueCount;
}

// Update dashboard
function updateDashboard() {
      const totalBills = records.length;
    // Use lifetimeRevenue instead of recalculating
    const totalRevenue = lifetimeRevenue;
    const pendingAmount = records.reduce((sum, record) => sum + Number(record.balance || 0), 0);
    const overdueCount = records.filter(record => isOverdue(record.date)).length;

    document.getElementById('dashTotalBills').textContent = totalBills;
    document.getElementById('dashTotalRevenue').textContent = `₹${totalRevenue.toFixed(2)}`;
    document.getElementById('dashPendingAmount').textContent = `₹${pendingAmount.toFixed(2)}`;
    document.getElementById('dashOverdueCount').textContent = overdueCount;

    updateFruitChart();
    updateRecentActivity();
}


// Update fruit popularity chart
function updateFruitChart() {
    const fruitCount = {};
    records.forEach(record => {
        fruitCount[record.fruit] = (fruitCount[record.fruit] || 0) + record.quantity;
    });
    
    const sortedFruits = Object.entries(fruitCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
    
    const chartContainer = document.getElementById('fruitChart');
    
    if (sortedFruits.length === 0) {
        chartContainer.innerHTML = '<p style="text-align: center; color: #666;">No data available</p>';
        return;
    }
    
    chartContainer.innerHTML = sortedFruits.map(([fruit, count]) => `
        <div class="fruit-item">
            <span><strong>${fruit}</strong></span>
            <span>${count} boxes</span>
        </div>
    `).join('');
}

// Update recent activity
function updateRecentActivity() {
    const recentRecords = [...records]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    const activityContainer = document.getElementById('recentActivity');
    
    if (recentRecords.length === 0) {
        activityContainer.innerHTML = '<p style="text-align: center; color: #666;">No recent activity</p>';
        return;
    }
    
    activityContainer.innerHTML = recentRecords.map(record => {
        const overdue = isOverdue(record.date);
        const activityClass = overdue ? 'activity-overdue' : '';
        
        return `
        <div class="activity-item ${activityClass}">
            <div><strong>${record.name}</strong> - ${record.fruit}</div>
            <div>₹${Number(record.monthlyCost || 0).toFixed(2)} (${record.quantity} boxes)</div>
            <div class="activity-time">${new Date(record.date).toLocaleString('en-IN')}</div>
            ${overdue ? '<div class="overdue-label">OVERDUE</div>' : ''}
        </div>
    `;
    }).join('');
}

// Show bill preview
function showBillPreview(record) {
    const modal = document.getElementById('billModal');
    const content = document.getElementById('billContent');
    
    content.innerHTML = `
        <div class="bill-details">
            <div style="text-align: center; margin-bottom: 2rem;">
                <h2>🍎 Janta Fruit Chamber</h2>
                <p>Cold Storage & Fruit Preservation</p>
                <hr style="margin: 1rem 0;">
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                <div>
                    <h3>Bill Details</h3>
                    <p><strong>Bill No:</strong> ${record.billNumber}</p>
                    <p><strong>Date:</strong> ${new Date(record.date).toLocaleDateString('en-IN')}</p>
                    <p><strong>Lot No:</strong> ${record.lotno || 'N/A'}</p>
                </div>
                <div>
                    <h3>Customer Details</h3>
                    <p><strong>Name:</strong> ${record.name}</p>
                    <p><strong>Mobile:</strong> ${record.mobile}</p>
                    <p><strong>Address:</strong> ${record.address || 'N/A'}</p>
                </div>
            </div>
            
            <h3>Item Details</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem;">
                <tr style="background: #f8f9fa;">
                    <th style="padding: 0.5rem; border: 1px solid #ddd;">Fruit</th>
                    <th style="padding: 0.5rem; border: 1px solid #ddd;">Weight/Box</th>
                    <th style="padding: 0.5rem; border: 1px solid #ddd;">Quantity</th>
                    <th style="padding: 0.5rem; border: 1px solid #ddd;">Total Weight</th>
                    <th style="padding: 0.5rem; border: 1px solid #ddd;">Rate</th>
                    <th style="padding: 0.5rem; border: 1px solid #ddd;">Monthly Cost</th>
                </tr>
                <tr>
                    <td style="padding: 0.5rem; border: 1px solid #ddd;">${record.fruit}</td>
                    <td style="padding: 0.5rem; border: 1px solid #ddd;">${record.weight} kg</td>
                    <td style="padding: 0.5rem; border: 1px solid #ddd;">${record.quantity}</td>
                    <td style="padding: 0.5rem; border: 1px solid #ddd;">${Number(record.totalWeight || 0).toFixed(1)} kg</td>
                    <td style="padding: 0.5rem; border: 1px solid #ddd;">₹${record.rate}/kg/month</td>
                    <td style="padding: 0.5rem; border: 1px solid #ddd;"><strong>₹${Number(record.monthlyCost || 0).toFixed(2)}</strong></td>
                </tr>
            </table>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                <div>
                    <h3>Payment Details</h3>
                    <p><strong>Monthly Cost:</strong> ₹${Number(record.monthlyCost || 0).toFixed(2)}</p>
                    <p><strong>Amount Paid:</strong> ₹${Number(record.paid || 0).toFixed(2)}</p>
                    <p style="color: ${Number(record.balance || 0) > 0 ? '#e53e3e' : '#38a169'};"><strong>Balance:</strong> ₹${Number(record.balance || 0).toFixed(2)}</p>
                </div>
                <div>
                    <h3>Additional Notes</h3>
                    <p>${record.notes || 'No additional notes'}</p>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd;">
                <p style="font-size: 0.9rem; color: #666;">Thank you for choosing Janta Fruit Chamber!</p>
                <p style="font-size: 0.8rem; color: #666;">Rate: ₹4 per kg per month</p>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

// View existing bill
function viewBill(recordId) {
    const record = records.find(r => r.id === recordId);
    if (record) {
        showBillPreview(record);
    }
}

// Close bill modal
function closeBillModal() {
    document.getElementById('billModal').style.display = 'none';
}

// Print bill
function printBill() {
    window.print();
}

// Show delete confirmation modal
function showDeleteModal(recordId) {
    deleteRecordId = recordId;
    document.getElementById('deleteModal').style.display = 'block';
}

// Close delete modal
function closeDeleteModal() {
    deleteRecordId = null;
    document.getElementById('deleteModal').style.display = 'none';
}

// Confirm delete
function confirmDelete() {
    if (deleteRecordId) {
        records = records.filter(record => record.id !== deleteRecordId);
        localStorage.setItem('fruitChamberRecords', JSON.stringify(records));
        
        displayRecords();
        updateAllStats();
        updateDashboard();
        
        showNotification('Record deleted successfully!', 'success');
        closeDeleteModal();
    }
}

// Export records to CSV
function exportRecords() {
    if (records.length === 0) {
        showNotification('No records to export!', 'error');
        return;
    }
    
    const headers = [
        'Bill Number', 'Date', 'Customer Name', 'Mobile', 'Address', 'Lot No',
        'Fruit', 'Weight per Box (kg)', 'Quantity', 'Total Weight (kg)', 'Rate per kg',
        'Monthly Cost', 'Amount Paid', 'Balance', 'Status', 'Notes'
    ];
    
    const csvContent = [
        headers.join(','),
        ...records.map(record => [
            record.billNumber,
            new Date(record.date).toLocaleDateString('en-IN'),
            `"${record.name}"`,
            record.mobile,
            `"${record.address || ''}"`,
            record.lotno || '',
            `"${record.fruit}"`,
            record.weight,
            record.quantity,
            Number(record.totalWeight || 0).toFixed(1),
            record.rate,
            Number(record.monthlyCost || 0).toFixed(2),
            Number(record.paid || 0).toFixed(2),
            Number(record.balance || 0).toFixed(2),
            isOverdue(record.date) ? 'Overdue' : 'Active',
            `"${record.notes || ''}"`
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `janta_fruit_chamber_records_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Records exported successfully!', 'success');
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = type === 'success' ? 'success-message' : 'error-message';
    notification.textContent = message;
    
    // Insert at the top of the current section
    const activeSection = document.querySelector('.section.active .container');
    activeSection.insertBefore(notification, activeSection.firstChild);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Close modals when clicking outside
window.onclick = function(event) {
    const deleteModal = document.getElementById('deleteModal');
    const billModal = document.getElementById('billModal');
    
    if (event.target === deleteModal) {
        closeDeleteModal();
    }
    if (event.target === billModal) {
        closeBillModal();
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Escape key to close modals
    if (e.key === 'Escape') {
        closeDeleteModal();
        closeBillModal();
    }
    
    // Ctrl+N for new bill (when not in input field)
    if (e.ctrlKey && e.key === 'n' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        e.preventDefault();
        showSection('billing');
        document.querySelector('.nav-btn').click();
    }
});

// Auto-save form data (draft)
function autoSaveForm() {
    const formData = {
        name: document.getElementById('name').value,
        address: document.getElementById('address').value,
        mobile: document.getElementById('mobile').value,
        lotno: document.getElementById('lotno').value,
        fruit: document.getElementById('fruit').value,
        weight: document.getElementById('weight').value,
        quantity: document.getElementById('quantity').value,
        paid: document.getElementById('paid').value,
        notes: document.getElementById('notes').value
    };
    
    localStorage.setItem('formDraft', JSON.stringify(formData));
}

// Load form draft
function loadFormDraft() {
    const draft = localStorage.getItem('formDraft');
    if (draft) {
        const formData = JSON.parse(draft);
        Object.keys(formData).forEach(key => {
            const element = document.getElementById(key);
            if (element && formData[key]) {
                element.value = formData[key];
            }
        });
        calculateTotal();
    }
}

// Clear form draft
function clearFormDraft() {
    localStorage.removeItem('formDraft');
}

// Add event listeners for auto-save
document.addEventListener('DOMContentLoaded', function() {
    const formInputs = document.querySelectorAll('#billingForm input, #billingForm select, #billingForm textarea');
    formInputs.forEach(input => {
        input.addEventListener('input', autoSaveForm);
    });
    
    // Load draft on page load
    loadFormDraft();
});

// Clear draft on successful submission
document.getElementById('billingForm').addEventListener('submit', function() {
    clearFormDraft();
});
// ...existing code...

let editRecordId = null;

function showEditModal(recordId) {
    editRecordId = recordId;
    const record = records.find(r => r.id === recordId);
    if (record) {
        document.getElementById('editPaid').value = record.paid || '';
        document.getElementById('editNotes').value = record.notes || '';
        document.getElementById('editModal').style.display = 'block';
    }
}

function closeEditModal() {
    editRecordId = null;
    document.getElementById('editModal').style.display = 'none';
}

// Handle edit form submit
document.getElementById('editForm').addEventListener('submit', function(e) {
    e.preventDefault();
    if (!editRecordId) return;
    const paid = parseFloat(document.getElementById('editPaid').value) || 0;
    const notes = document.getElementById('editNotes').value.trim();
    const idx = records.findIndex(r => r.id === editRecordId);
    if (idx !== -1) {
        records[idx].paid = paid;
        records[idx].balance = (records[idx].monthlyCost || 0) - paid;
        records[idx].notes = notes;
        localStorage.setItem('fruitChamberRecords', JSON.stringify(records));
        displayRecords();
        updateAllStats();
        updateDashboard();
        showNotification('Record updated successfully!', 'success');
        closeEditModal();
    }
});

// Close edit modal on outside click
window.addEventListener('click', function(event) {
    const editModal = document.getElementById('editModal');
    if (event.target === editModal) {
        closeEditModal();
    }
});

// Close edit modal on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeEditModal();
    }
});

// ...existing code...

let boxOutRecords = JSON.parse(localStorage.getItem('boxOutRecords') || '[]');



// Populate Bill No dropdown with existing bills
function populateBoxOutBillNos() {
    const select = document.getElementById('boxoutBillNo');
    select.innerHTML = '<option value="">Select Bill No</option>';
    records.forEach(r => {
        select.innerHTML += `<option value="${r.billNumber}">${r.billNumber} (${r.name})</option>`;
    });
}

// Update date/time and boxes left when bill is selected or boxes out changes
document.getElementById('boxoutBillNo').addEventListener('change', updateBoxOutInfo);
document.getElementById('boxoutBoxes').addEventListener('input', updateBoxOutInfo);

function updateBoxOutInfo() {
    const billNo = document.getElementById('boxoutBillNo').value;
    const boxesOut = parseInt(document.getElementById('boxoutBoxes').value) || 0;
    const record = records.find(r => r.billNumber === billNo);
    const totalBoxes = record ? record.quantity : 0;
    const alreadyOut = boxOutRecords
        .filter(b => b.billNumber === billNo)
        .reduce((sum, b) => sum + b.boxesOut, 0);
    const left = totalBoxes - alreadyOut - boxesOut;
    document.getElementById('boxoutLeft').value = left >= 0 ? left : 0;
    document.getElementById('boxoutDateTime').value = new Date().toLocaleString();
}

// Handle Box Out form submit
document.getElementById('boxOutForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('boxoutName').value.trim();
    const billNumber = document.getElementById('boxoutBillNo').value;
    const boxesOut = parseInt(document.getElementById('boxoutBoxes').value);
    const dateTime = new Date().toLocaleString();

    if (!name || !billNumber || !boxesOut || boxesOut < 1) {
        showNotification('Please fill all required fields.', 'error');
        return;
    }

    // Check if enough boxes are left
    const record = records.find(r => r.billNumber === billNumber);
    const totalBoxes = record ? record.quantity : 0;
    const alreadyOut = boxOutRecords
        .filter(b => b.billNumber === billNumber)
        .reduce((sum, b) => sum + b.boxesOut, 0);

    if (boxesOut > (totalBoxes - alreadyOut)) {
        showNotification('Not enough boxes left for this bill.', 'error');
        return;
    }

    const left = totalBoxes - alreadyOut - boxesOut;

    // Save box out record
    boxOutRecords.push({
        name,
        billNumber,
        boxesOut,
        dateTime,
        left
    });
    localStorage.setItem('boxOutRecords', JSON.stringify(boxOutRecords));
    showNotification('Box out entry saved!', 'success');
    displayBoxOutHistory();
    clearBoxOutForm();
    updateBoxOutInfo();
});

// Display Box Out history
function displayBoxOutHistory() {
    const tbody = document.getElementById('boxOutHistory');
    if (!tbody) return;
    tbody.innerHTML = boxOutRecords.slice().reverse().map(b => `
        <tr>
            <td>${b.name}</td>
            <td>${b.billNumber}</td>
            <td>${b.boxesOut}</td>
            <td>${b.dateTime}</td>
            <td>${b.left}</td>
        </tr>
    `).join('');
}

// Clear Box Out form
function clearBoxOutForm() {
    document.getElementById('boxOutForm').reset();
    document.getElementById('boxoutDateTime').value = new Date().toLocaleString();
    document.getElementById('boxoutLeft').value = '';
}

// --- Password Protection ---
const APP_PASSWORD = "24"; // Change this to your desired password

document.addEventListener('DOMContentLoaded', function() {
    const passwordModal = document.getElementById('passwordModal');
    const mainContent = document.body;
    if (passwordModal) {
        // Hide all main content except modal
        Array.from(mainContent.children).forEach(child => {
            if (child !== passwordModal) child.style.display = 'none';
        });

        document.getElementById('passwordForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const input = document.getElementById('appPassword').value;
            if (input === APP_PASSWORD) {
                // Hide modal, show app
                passwordModal.style.display = 'none';
                Array.from(mainContent.children).forEach(child => {
                    if (child !== passwordModal) child.style.display = '';
                });
            } else {
                document.getElementById('passwordError').textContent = "Incorrect password!";
                document.getElementById('passwordError').style.display = 'block';
            }
        });
    }
});
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && document.getElementById('passwordModal').style.display !== 'none') {
        document.getElementById('appPassword').value = '';
    }
});