const API_BASE_URL = 'http://localhost/hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    loadTrainees();
    loadPayments();

    document.getElementById('paymentForm').addEventListener('submit', handleAddPayment);
});

async function loadTrainees() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/manage_payments.php?action=get-trainees`);
        if (response.data.success) {
            const select = document.getElementById('traineeSelect');
            select.innerHTML = '<option value="">Select Trainee</option>';
            response.data.data.forEach(t => {
                select.innerHTML += `<option value="${t.trainee_id}">${t.last_name}, ${t.first_name}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading trainees:', error);
    }
}

async function loadPayments() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/manage_payments.php?action=list`);
        if (response.data.success) {
            const tbody = document.querySelector('#paymentsTable tbody');
            tbody.innerHTML = '';
            response.data.data.forEach(p => {
                tbody.innerHTML += `
                    <tr>
                        <td>${p.payment_date}</td>
                        <td>${p.last_name}, ${p.first_name}</td>
                        <td>₱${parseFloat(p.amount).toFixed(2)}</td>
                        <td>${p.payment_method}</td>
                        <td>${p.reference_no || '-'}</td>
                        <td>${p.remarks || '-'}</td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error('Error loading payments:', error);
    }
}

async function handleAddPayment(e) {
    e.preventDefault();
    const data = {
        trainee_id: document.getElementById('traineeSelect').value,
        amount: document.getElementById('amount').value,
        payment_date: document.getElementById('paymentDate').value,
        payment_method: document.getElementById('paymentMethod').value,
        reference_no: document.getElementById('referenceNo').value,
        remarks: document.getElementById('remarks').value
    };

    try {
        const response = await axios.post(`${API_BASE_URL}/role/admin/manage_payments.php?action=add`, data);
        if (response.data.success) {
            alert('Payment recorded successfully');
            document.getElementById('paymentForm').reset();
            loadPayments();
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error adding payment:', error);
        alert('Failed to add payment');
    }
}