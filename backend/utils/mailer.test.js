const { brandedEmailTemplate } = require('./mailer');

describe('brandedEmailTemplate shipment status', () => {
  test('renders exception styling and warning without requiring a tracking number', () => {
    const html = brandedEmailTemplate({
      name: 'Customer',
      subject: 'Shipment update',
      message: 'Your shipment has an exception.',
      status: 'exception'
    });

    expect(html).toContain('background:#d00000');
    expect(html).toContain('font-weight:bold');
    expect(html).toContain('&#9888; EXCEPTION / HELD');
  });

  test('renders the selected normal status in its status badge without a tracking number', () => {
    const html = brandedEmailTemplate({
      name: 'Customer',
      subject: 'Shipment update',
      message: 'Your shipment is moving.',
      status: 'in_transit'
    });

    expect(html).toContain('background:#006a9c');
    expect(html).toContain('IN TRANSIT');
    expect(html).toContain('<strong>Status</strong>');
  });
});
