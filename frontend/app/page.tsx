import Link from "next/link";
import { Header } from "@/components/Header";

export default function Home() {
  return <><Header/><main className="shell landing">
    <section className="pilot-hero">
      <div className="hero-copy">
        <span className="eyebrow">QAZLOYAL · БЕСПЛАТНЫЙ ПИЛОТ</span>
        <h1>Бонусная программа<br/>для вашей <em>кофейни или магазина.</em></h1>
        <p className="hero-description">Начисляйте бонусы за покупки. При следующем визите клиент использует их по вашим правилам, а вы видите баланс и историю.</p>
        <div className="hero-actions"><Link className="primary" href="/register">Попробовать бесплатно <span aria-hidden="true">↗</span></Link><a className="secondary-link" href="#how-it-works">Посмотреть пример ↓</a></div>
        <p className="hero-note">Для владельцев небольшого бизнеса · Работает в браузере</p>
      </div>
      <aside className="loyalty-preview" aria-label="Пример карточки клиента с вымышленными данными">
        <div className="preview-top"><span>ВАШ БИЗНЕС</span><span className="preview-tag">Пример</span></div>
        <div className="preview-person"><span className="preview-avatar" aria-hidden="true">А</span><div><h2>Айдана</h2><p>Клиент вашей кофейни</p></div></div>
        <div className="preview-balance"><span>Баланс клиента</span><strong>400 <small>QL</small></strong><p>Бонусы для следующего визита</p></div>
        <div className="preview-operation"><span className="operation-icon" aria-hidden="true">+</span><div><strong>Покупка на 10 000 ₸</strong><span>Начисление при ставке 5%</span></div><b>+500 QL</b></div>
        <div className="preview-operation"><span className="operation-icon debit" aria-hidden="true">−</span><div><strong>Следующий визит</strong><span>Клиент использовал бонусы</span></div><b>−100 QL</b></div>
        <p className="preview-caption">Вымышленный пример. Реальные операции появятся в вашем кабинете.</p>
      </aside>
    </section>
    <section id="how-it-works" className="how-section"><span className="eyebrow">ПОНЯТНО С ПЕРВОЙ ПОКУПКИ</span><h2>Три шага к вашей программе лояльности</h2><div className="pilot-steps">
      <article><span className="step-number">01</span><h3>Добавьте клиента</h3><p>Создайте бизнес и укажите имя клиента. Телефон и email — по желанию.</p></article>
      <article><span className="step-number">02</span><h3>Начислите бонусы</h3><p>Введите сумму покупки. Расчёт и будущий баланс видны до подтверждения.</p></article>
      <article><span className="step-number">03</span><h3>Встретьте снова</h3><p>Предоставьте скидку или подарок по вашим условиям и спишите бонусы.</p></article>
    </div></section>
    <section className="pilot-details" aria-labelledby="pilot-title"><div><span className="eyebrow">ЧЕСТНО О ПИЛОТЕ</span><h2 id="pilot-title">Начните с одного бизнеса.</h2><p>Участие в текущем пилоте бесплатное. В кабинете работают клиенты, начисление, списание и история. Данные сохраняются после выхода.</p><Link className="primary" href="/register">Создать свой бизнес</Link></div><div className="pilot-faq">
      <details><summary>Что такое QL?</summary><p>Это бонусы вашего бизнеса. У них нет единого денежного курса: вы сами определяете скидку или подарок и объясняете условия клиентам.</p></details>
      <details><summary>Кто может пользоваться сейчас?</summary><p>Пилот подходит для точки, где операции проводит сам владелец. Приглашения сотрудников и восстановление пароля по email пока отключены — сохраните пароль.</p></details>
      <details><summary>Нужна ли интеграция с кассой?</summary><p>Нет. Сумму покупки вводите вручную. QazLoyal не принимает платежи и не применяет скидку в кассе автоматически.</p></details>
      <details><summary>Как задать вопрос или сообщить об ошибке?</summary><p>Напишите автору в <a href="https://www.threads.com/@dtp__net" target="_blank" rel="noopener noreferrer">Threads: @dtp__net ↗</a> или ответьте под публикацией о QazLoyal. Не отправляйте пароли и личные данные клиентов.</p></details>
    </div></section>
    <footer className="pilot-footer"><span>QazLoyal · Бонусы для ваших клиентов</span><a href="https://www.threads.com/@dtp__net" target="_blank" rel="noopener noreferrer">Связаться с автором ↗</a><Link href="/login">Войти в кабинет</Link></footer>
  </main></>;
}
