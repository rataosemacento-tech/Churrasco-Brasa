(function () {
  'use strict';

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const totalElement = document.getElementById('thank-you-total');
  const transactionElement = document.getElementById('thank-you-transaction');

  try {
    const raw = sessionStorage.getItem('churrascoPaymentOrder');
    const order = raw ? JSON.parse(raw) : null;
    const total = Number(order && order.total);
    if (Number.isFinite(total)) totalElement.textContent = currency.format(total);

    const transactionId = new URLSearchParams(window.location.search).get('transaction_id');
    if (transactionId) {
      transactionElement.textContent = `Transação ${transactionId.slice(0, 18)} confirmada`;
    }

    sessionStorage.removeItem('churrasco-brasa-cart-draft');
    sessionStorage.removeItem('churrascoDeliveryDraft');
    sessionStorage.removeItem('churrascoPaymentOrder');
  } catch {
    // A tela de confirmação continua sendo exibida mesmo sem acesso à sessão.
  }
}());
