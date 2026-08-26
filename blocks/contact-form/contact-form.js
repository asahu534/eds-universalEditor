// The Worker URL is the "middleman" that holds the secret and calls the real API.
// Replace this with your deployed Cloudflare Worker URL, or set it in the first
// block row so authors/editors can change it without touching code.
const DEFAULT_ENDPOINT = 'https://form-proxy.arunima-sahu.workers.dev';

/**
 * Reads optional configuration from the block's rows.
 * Row 0: worker endpoint URL (optional, falls back to DEFAULT_ENDPOINT)
 * Row 1: submit button label (optional)
 * Row 2: success message (optional)
 */
function readConfig(block) {
  const rows = [...block.children];
  const endpoint = rows[0]?.textContent.trim() || DEFAULT_ENDPOINT;
  const submitLabel = rows[1]?.textContent.trim() || 'Send message';
  const successMessage = rows[2]?.textContent.trim()
    || 'Thanks — your message has been sent.';
  return { endpoint, submitLabel, successMessage };
}

function field(name, label, type, required) {
  const wrapper = document.createElement('div');
  wrapper.className = 'contact-form-field';

  const id = `contact-form-${name}`;
  const labelEl = document.createElement('label');
  labelEl.setAttribute('for', id);
  labelEl.textContent = label;

  const input = type === 'textarea'
    ? document.createElement('textarea')
    : document.createElement('input');
  input.id = id;
  input.name = name;
  if (type !== 'textarea') input.type = type;
  if (required) input.required = true;

  wrapper.append(labelEl, input);
  return wrapper;
}

export default async function decorate(block) {
  const { endpoint, submitLabel, successMessage } = readConfig(block);

  block.textContent = '';

  const form = document.createElement('form');
  form.className = 'contact-form-form';
  form.noValidate = true;

  form.append(
    field('name', 'Name', 'text', true),
    field('email', 'Email', 'email', true),
    field('message', 'Message', 'textarea', true),
  );

  // Honeypot field — hidden from humans, catches simple bots. If it's filled,
  // we silently drop the submission.
  const honeypot = document.createElement('input');
  honeypot.type = 'text';
  honeypot.name = 'company';
  honeypot.className = 'contact-form-hp';
  honeypot.tabIndex = -1;
  honeypot.autocomplete = 'off';
  honeypot.setAttribute('aria-hidden', 'true');
  form.append(honeypot);

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'contact-form-submit';
  submit.textContent = submitLabel;
  form.append(submit);

  const status = document.createElement('p');
  status.className = 'contact-form-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  form.append(status);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = '';
    status.className = 'contact-form-status';

    // Bot caught by honeypot — pretend success, do nothing.
    if (honeypot.value) {
      status.textContent = successMessage;
      status.classList.add('success');
      form.reset();
      return;
    }

    if (!form.checkValidity()) {
      status.textContent = 'Please fill in all fields with a valid email.';
      status.classList.add('error');
      return;
    }

    const payload = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      message: form.elements.message.value.trim(),
    };

    submit.disabled = true;
    submit.textContent = 'Sending…';

    try {
      // We POST to the Worker (the middleman) — never to the protected API
      // directly. The Worker holds the secret and does the token exchange.
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      status.textContent = successMessage;
      status.classList.add('success');
      form.reset();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Contact form submission failed', error);
      status.textContent = 'Something went wrong. Please try again later.';
      status.classList.add('error');
    } finally {
      submit.disabled = false;
      submit.textContent = submitLabel;
    }
  });

  block.append(form);
}
