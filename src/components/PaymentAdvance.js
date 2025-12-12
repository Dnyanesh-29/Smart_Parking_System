import React, { useState } from 'react';
import './PaymentAdvance.css';

const PaymentAdvance = ({ bookingDetails, onPaymentComplete, onCancel }) => {
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [cardDetails, setCardDetails] = useState({
        number: '',
        expiry: '',
        cvv: '',
        name: ''
    });
    const [upiId, setUpiId] = useState('');
    const [processing, setProcessing] = useState(false);
    const [advanceAmount, setAdvanceAmount] = useState(50); // Default ₹50 advance

    const totalFee = bookingDetails?.totalFee || 0;
    const remainingAmount = totalFee - advanceAmount;

    const handleCardInputChange = (field, value) => {
        setCardDetails(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const formatCardNumber = (value) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        if (parts.length) {
            return parts.join(' ');
        } else {
            return v;
        }
    };

    const formatExpiry = (value) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        if (v.length >= 2) {
            return v.substring(0, 2) + '/' + v.substring(2, 4);
        }
        return v;
    };

    const validatePayment = () => {
        if (paymentMethod === 'card') {
            return cardDetails.number.replace(/\s/g, '').length === 16 &&
                   cardDetails.expiry.length === 5 &&
                   cardDetails.cvv.length === 3 &&
                   cardDetails.name.trim().length > 0;
        } else if (paymentMethod === 'upi') {
            return upiId.includes('@') && upiId.length > 5;
        }
        return false;
    };

    const processPayment = async () => {
        if (!validatePayment()) {
            alert('Please fill all payment details correctly');
            return;
        }

        setProcessing(true);

        try {
            // Simulate payment processing
            await new Promise(resolve => setTimeout(resolve, 2000));

            // In real implementation, integrate with payment gateway
            const paymentResult = {
                success: true,
                transactionId: 'TXN' + Date.now(),
                advanceAmount: advanceAmount,
                remainingAmount: remainingAmount,
                paymentMethod: paymentMethod,
                timestamp: new Date().toISOString()
            };

            onPaymentComplete(paymentResult);
        } catch (error) {
            console.error('Payment failed:', error);
            alert('Payment failed. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="payment-container">
            <div className="payment-header">
                <button className="back-btn" onClick={onCancel}>←</button>
                <h1>Payment</h1>
            </div>

            <div className="payment-content">
                {/* Booking Summary */}
                <div className="booking-summary-card">
                    <h3>Booking Summary</h3>
                    <div className="summary-details">
                        <div className="summary-row">
                            <span>Location</span>
                            <span>{bookingDetails?.location || 'Smart Parking Mall'}</span>
                        </div>
                        <div className="summary-row">
                            <span>Floor</span>
                            <span>{bookingDetails?.floorName} Floor</span>
                        </div>
                        <div className="summary-row">
                            <span>Duration</span>
                            <span>{bookingDetails?.duration} hour{bookingDetails?.duration > 1 ? 's' : ''}</span>
                        </div>
                        <div className="summary-row">
                            <span>Date & Time</span>
                            <span>{bookingDetails?.startTime?.toLocaleDateString()} {bookingDetails?.startTime?.toLocaleTimeString()}</span>
                        </div>
                        <div className="summary-row total">
                            <span>Total Amount</span>
                            <span>₹{totalFee}</span>
                        </div>
                    </div>
                </div>

                {/* Advance Payment Options */}
                <div className="advance-options">
                    <h3>Advance Payment</h3>
                    <p className="advance-note">Pay a small advance to confirm your booking. Remaining amount to be paid at the parking location.</p>
                    
                    <div className="advance-amounts">
                        {[50, 100, 150].map(amount => (
                            <button
                                key={amount}
                                className={`advance-btn ${advanceAmount === amount ? 'selected' : ''}`}
                                onClick={() => setAdvanceAmount(amount)}
                                disabled={amount > totalFee}
                            >
                                ₹{amount}
                            </button>
                        ))}
                    </div>

                    <div className="payment-breakdown">
                        <div className="breakdown-row">
                            <span>Advance Payment</span>
                            <span>₹{advanceAmount}</span>
                        </div>
                        <div className="breakdown-row">
                            <span>Pay at Location</span>
                            <span>₹{remainingAmount}</span>
                        </div>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="payment-methods">
                    <h3>Payment Method</h3>
                    
                    <div className="method-tabs">
                        <button
                            className={`method-tab ${paymentMethod === 'card' ? 'active' : ''}`}
                            onClick={() => setPaymentMethod('card')}
                        >
                            💳 Card
                        </button>
                        <button
                            className={`method-tab ${paymentMethod === 'upi' ? 'active' : ''}`}
                            onClick={() => setPaymentMethod('upi')}
                        >
                            📱 UPI
                        </button>
                    </div>

                    {/* Card Payment Form */}
                    {paymentMethod === 'card' && (
                        <div className="card-form">
                            <div className="form-group">
                                <label>Card Number</label>
                                <input
                                    type="text"
                                    placeholder="1234 5678 9012 3456"
                                    value={cardDetails.number}
                                    onChange={(e) => handleCardInputChange('number', formatCardNumber(e.target.value))}
                                    maxLength="19"
                                />
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Expiry Date</label>
                                    <input
                                        type="text"
                                        placeholder="MM/YY"
                                        value={cardDetails.expiry}
                                        onChange={(e) => handleCardInputChange('expiry', formatExpiry(e.target.value))}
                                        maxLength="5"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>CVV</label>
                                    <input
                                        type="text"
                                        placeholder="123"
                                        value={cardDetails.cvv}
                                        onChange={(e) => handleCardInputChange('cvv', e.target.value.replace(/\D/g, ''))}
                                        maxLength="3"
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>Cardholder Name</label>
                                <input
                                    type="text"
                                    placeholder="John Doe"
                                    value={cardDetails.name}
                                    onChange={(e) => handleCardInputChange('name', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* UPI Payment Form */}
                    {paymentMethod === 'upi' && (
                        <div className="upi-form">
                            <div className="form-group">
                                <label>UPI ID</label>
                                <input
                                    type="text"
                                    placeholder="yourname@paytm"
                                    value={upiId}
                                    onChange={(e) => setUpiId(e.target.value)}
                                />
                            </div>
                            
                            <div className="upi-apps">
                                <p>Or pay using</p>
                                <div className="app-buttons">
                                    <button className="app-btn">📱 PhonePe</button>
                                    <button className="app-btn">💰 Paytm</button>
                                    <button className="app-btn">🏦 GPay</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Security Note */}
                <div className="security-note">
                    <div className="security-icon">🔒</div>
                    <div className="security-text">
                        <p>Your payment information is secure and encrypted</p>
                        <p>We don't store your card details</p>
                    </div>
                </div>

                {/* Payment Button */}
                <button
                    className="pay-btn"
                    onClick={processPayment}
                    disabled={!validatePayment() || processing}
                >
                    {processing ? (
                        <span>
                            <div className="spinner-small"></div>
                            Processing...
                        </span>
                    ) : (
                        `Pay ₹${advanceAmount} Now`
                    )}
                </button>

                <p className="payment-terms">
                    By proceeding, you agree to our terms and conditions. 
                    Remaining ₹{remainingAmount} will be collected at the parking location.
                </p>
            </div>
        </div>
    );
};

export default PaymentAdvance;