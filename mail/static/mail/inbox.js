document.addEventListener('DOMContentLoaded', function() {

  // Переключение между вкладками
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', () => compose_email('new'));

  // Вкладка по-умолчанию
  load_mailbox('inbox');
});

function compose_email(type, email) {

  // Отображать только блок div для создания email
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Recipients field read only when replying to emails
  document.querySelector('#compose-recipients').readOnly = (type === 'new') ? false : true;

  // Изначальные ппараметры для email
  var title, recipients, subject, body;
  recipients = ''; 
  subject = '';
  body = '';
  title = (type === 'reply') ? "Reply to email" : "New Email";

  // Задаем постоянные элементы
  const submitButton = document.querySelector('#compose-submit');
  const recipientsList = document.querySelector('#compose-recipients');

  // Заполнение полей для ответа с параметрами адресов "readonly"
  if (type === 'reply') {
    recipients = email.sender;
    subject = (email.subject.slice(0,3) === 'Re:') ? email.subject : `Re: ${email.subject}`;
    body = `\n\n>> On ${email.timestamp} ${email.sender} wrote: \n${email.body}`;
  } 

  // HTML нового письма
  document.querySelector('#compose-title').innerHTML = title;
  document.querySelector('#compose-recipients').value = recipients;
  document.querySelector('#compose-subject').value = subject;
  document.querySelector('#compose-body').value = body;

  // Удаляет сообщения проверки
  document.querySelector('#compose-result').innerHTML = '';
  document.querySelector('#compose-result').style.display = 'none';

  // Блокирует кнопку "Submit" если нужно
  blockButtonForField(submitButton, recipientsList)

  // Listen for форму отправки
  document.querySelector('#compose-form').onsubmit = () => {
    
    // Сохряняет заполненные фотмы в объект для отправки письма (для send_email)
    const emailObject = {
      recipients: recipientsList.value,
      subject: document.querySelector('#compose-subject').value,
      body: document.querySelector('#compose-body').value
    };

    send_email(emailObject)

    // Предотвратит автоматическую отправку формы
    return false;
  };
  
}

function send_email(emailObject) {
  // Обрабатывет POST поля email для отправки
  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      recipients: emailObject.recipients,
      subject: emailObject.subject,
      body: emailObject.body
    })
  })
  .then(response => response.json())
  .then(result => {
    // В случае успеха перенаправить на вкладку "Sent"
    if (!result.error) {
      load_mailbox('sent')
    } 
    else {
      document.querySelector('#compose-result').innerHTML = result.error;
      document.querySelector('#compose-result').style.display = 'block';
      scroll(0,0);
    }
  })
  .catch(error => {
    console.error(error);
  })

}

function load_mailbox(mailbox) {

  // Показать только блок с входящими email
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';

  // Показывает название письма
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Получение писем
  getEmailsHTML(mailbox);

}

// Обновляет HTML страницы дляполучения всех полученных писем
async function getEmailsHTML(mailbox) {
  
  // Получает (ждет) данные письма в формате JSON
  const emails = await getAllEmails(mailbox);

  // Если писем нет, обновляет HTML
  if (emails.length === 0) {
    const noResults = document.createElement('div');
    noResults.innerHTML = "You have 0 messages.";
    document.getElementById("emails-view").appendChild(noResults);
  }

  // Создаем HTML каждого письма
  emails.forEach((email, index) => {
    
    // Добавляет новый div с HTML и стиль показаписьма
    const emailDiv = document.createElement('div');
    
    // Устанавливает первый столбец в соответствии с письмом
    let firstColumn = (mailbox != "sent") ? `From: ${email.sender}` : `<strong>To: ${email.recipients}</strong>`;
    
    emailDiv.innerHTML = `
      <div class="col-6 col-sm-7 col-md-4 p-2 text-truncate">${firstColumn}</div>
      <div class="col-6 col-sm-5 col-md-3 p-2 order-md-2 small text-right text-muted font-italic font-weight-lighter align-self-center">${email.timestamp}</div>
      <div class="col px-2 pb-2 pt-md-2 order-md-1 text-truncate">${email.subject}</div>
    `;
    emailDiv.className = 'row justify-content-between border border-left-0 border-right-0 border-bottom-0 pointer-link p-2';

    // Меняет цвет прочитанных писем на серый
    if (mailbox === "inbox" && email.read == true) {
      emailDiv.style.backgroundColor = '#D3D3D3';
    } 
    // Непрочитанные письма выделяются жирным
    if (mailbox === "inbox" && email.read == false) {
      emailDiv.classList.add('font-weight-bold');
    }

    // Открывание письма по клику
    emailDiv.addEventListener('click', function () {
      openEmail(email, mailbox);
    },)

    // Настройки границ полученных писем
    if (index == emails.length - 1) {
      emailDiv.classList.remove('border-bottom-0');
    }

    // Добавляет HTML письма на страницу с письмами
    document.getElementById("emails-view").appendChild(emailDiv);

  });
}

// Извлекает JSON данные письма для полученных писем
async function getAllEmails(mailbox) {
  const response = await fetch(`/emails/${mailbox}`);
  const jsonEmailData = await response.json();
  return jsonEmailData;
}

function openEmail(email, mailbox) {
  // Маркерует письмо прочитанным если оно еще не прочитано
  if (!email.read) {
    readEmail(email)
  }
  // Получение HTML письма
  getEmail(email, mailbox)
}

// Маркерует письмо прочитанным
function readEmail(email) {
  fetch(`/emails/${email.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      read: true
    })
  });
}

function getEmail(email, mailbox) {
  
  // Показывает только div с письмом
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'block';
  
  document.querySelector('#email-view').innerHTML = `
  <div class="d-flex justify-content-between flex-nowrap-sm flex-wrap">
    <h5 class="text-wrap">${email.subject}</h5>
    <small class="mr-lg-4 ml-0 ml-sm-2 font-weight-lighter align-self-center text-muted text-right"><em>${email.timestamp}</em></small>
  </div>

  <div class="d-flex justify-content-between py-3 pt-md-2 border-bottom flex-wrap">
    <div>
      <strong>From:</strong> ${email.sender}<br>
      <strong>To:</strong> ${email.recipients}<br>
    </div>
    <div class="text-nowrap mr-lg-4 ml-0 ml-sm-2" id="buttons">
    </div>
  </div>

  <div class="pt-1" style="white-space: pre-line">
    ${email.body}
  </div>
  `
  // Добавляет кнопки "Archive/Unarchive" и "Reply" для вкладок "Inbox" и "Archive"
  let buttonsDiv = document.getElementById('buttons');
  if (mailbox != 'sent') {
    
    // Добавить кнопку "reply" в HTML
    const replyButton = document.createElement('button');
    replyButton.type = 'button';
    replyButton.innerHTML = '<i class="fas fa-reply"></i>';
    replyButton.className = 'btn btn-outline-dark btn-sm mr-1';

    // Добавляет кнопку "reply" в DOM
    buttonsDiv.appendChild(replyButton);

    // Добавляет кликер "reply"
    replyButton.onclick = () => {
      compose_email('reply', email)
    }
    
    // Добавляет кнопку "Archive"
    const archiveButton = document.createElement('button');
    var buttonText = (email.archived == false) ? "Archive" : "Unarchive";
    archiveButton.type = 'button';
    archiveButton.innerHTML = buttonText;
    archiveButton.className = 'btn btn-outline-dark btn-sm'

    // Добавляет кнопку "archive" в DOM
    buttonsDiv.appendChild(archiveButton);
    
    // Доюбавляет кликер "archive"
    archiveButton.onclick = () => {
      archiveEmail(email);
    } 
  }
  
}

async function archiveEmail(email) {
  // Архиватор писем
  await fetch(`/emails/${email.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      archived: !email.archived
    })
  })
  return load_mailbox('inbox');
}

// Блокировка кнопки при незаполненном обязательном текстовом поле
function blockButtonForField(button, mandatoryField) {

  // Разблокирует кнупку, если поля заполнены
  if (mandatoryField.value.length == 0) {
    button.disabled = true;
  }

  // Параметры поля обязательного для заполнения
  mandatoryField.onkeyup = () => {
    if (mandatoryField.value.length > 0) {
      button.disabled = false;
    } else {
      button.disabled = true;
    }
  }
}