import Link from "next/link";
import { ProductIcon, PublicFrame } from "@/components/common/ProductUI";

const features = [
  ["shield", "Анонимно", "Имя, телефон и адрес не нужны — только то, чем готов поделиться."],
  ["message", "По-человечески", "Выбери тему или напиши своими словами, без сложных форм."],
  ["users", "С поддержкой", "Обращение попадёт к нужному специалисту и не потеряется."],
];

export default function HomePage() {
  return <PublicFrame><section className="ot-hero"><div className="ot-reveal"><p className="ot-eyebrow">Безопасное пространство для разговора</p><h1><em>Отклик</em> помогает<br/>сделать первый шаг.</h1><p className="ot-description">Расскажи, что происходит, и получи поддержку. Без регистрации, давления и лишних вопросов.</p><div className="ot-hero-actions"><Link href="/submit" className="ot-button">Рассказать о ситуации <ProductIcon name="arrow"/></Link><Link href="#why" className="ot-link">Как это работает <ProductIcon name="arrow"/></Link></div><p className="ot-caption"><ProductIcon name="shield"/> Конфиденциально с первого шага</p></div><div className="ot-orbit"><div className="ot-orbit-glow"/><div className="ot-orbit-mark"><ProductIcon name="message"/></div><div className="ot-orbit-note top"><ProductIcon name="spark"/>Тебя услышат</div><div className="ot-orbit-note bottom"><ProductIcon name="check"/>Без лишних вопросов</div><span className="ot-orbit-dot"/></div></section><section id="why" className="ot-section"><p className="ot-eyebrow">Просто. Бережно. По делу.</p><h2>Всё, что нужно для первого шага</h2><div className="ot-feature-grid">{features.map(([icon,title,text])=><article className="ot-feature" key={title}><div className="ot-symbol"><ProductIcon name={icon}/></div><h3>{title}</h3><p>{text}</p></article>)}</div></section><section className="ot-section"><div className="ot-how"><h2>Твой путь к поддержке</h2><ol><li><span>01</span><strong>Расскажи</strong><p>Выбери тему или начни с одной фразы.</p></li><li><span>02</span><strong>Получи ответ</strong><p>Специалист подключится, когда будет готов.</p></li><li><span>03</span><strong>Будь в курсе</strong><p>Проверяй статус по личному коду.</p></li></ol></div></section></PublicFrame>;
}



