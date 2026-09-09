import { useEffect, useState } from "react";
import {
  Alert, ScrollView, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiPost, staffGet } from "../api";
import { S } from "../theme";

export function Login({ nav }: { nav: (s: string) => void }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  async function go() {
    try {
      const r = await apiPost("/api/login", { login, password });
      await AsyncStorage.setItem("token", r.token);
      await AsyncStorage.setItem("role", r.role);
      nav(r.role === "operator" ? "operator" : r.role === "expert" ? "expert" : "admin");
    } catch {
      Alert.alert("Не вышло", "Неверный логин или пароль");
    }
  }
  return (
    <ScrollView style={S.wrap} contentContainerStyle={S.pad}>
      <View style={S.card}>
        <Text style={S.h2}>Вход для команды</Text>
        <TextInput style={S.input} value={login} onChangeText={setLogin} placeholder="Логин" autoCapitalize="none" />
        <TextInput style={S.input} value={password} onChangeText={setPassword} placeholder="Пароль" secureTextEntry />
        <TouchableOpacity style={S.btn} onPress={go}>
          <Text style={S.btnText}>Войти</Text>
        </TouchableOpacity>
        <Text style={S.small}>Демо: operator1/oper123, expert_psy/exp123, admin/admin123</Text>
      </View>
    </ScrollView>
  );
}

type Appeal = {
  id: number; text: string; status: string; priority: string;
  crisis: boolean; answers: Record<string, string>; files: string[];
};

function Answers({ a }: { a: Record<string, string> }) {
  const vals = Object.values(a || {}).filter(Boolean);
  if (!vals.length) return null;
  return <Text style={S.small}>Уточнения: {vals.join(" · ")}</Text>;
}

export function Operator() {
  const [rows, setRows] = useState<Appeal[]>([]);
  const [open, setOpen] = useState<Appeal | null>(null);
  const [suggest, setSuggest] = useState<{ group: string | null; free: { id: number; login: string; load: number }[] }>({ group: null, free: [] });
  function load() { staffGet("/api/operator/queue").then(setRows).catch(() => {}); }
  useEffect(load, []);
  async function openCard(a: Appeal) {
    setOpen(a);
    try { setSuggest(await staffGet(`/api/operator/suggest/${a.id}`)); }
    catch { setSuggest({ group: null, free: [] }); }
  }
  async function assign(expert_id: number) {
    if (!open) return;
    await apiPost(`/api/operator/appeals/${open.id}/assign`, { expert_id, priority: "standard" });
    setOpen(null); load();
  }
  async function reject() {
    if (!open) return;
    await apiPost(`/api/operator/appeals/${open.id}/close`, { spam: true, reason: "спам" });
    setOpen(null); load();
  }
  const crisis = rows.filter((r) => r.crisis);
  const rest = rows.filter((r) => !r.crisis);
  return (
    <ScrollView style={S.wrap} contentContainerStyle={S.pad}>
      <View style={S.card}>
        <Text style={S.h2}>Новые обращения</Text>
        {crisis.map((a) => (
          <View key={a.id} style={S.crisis}>
            <Text style={[S.badge, S.badgeUrgent]}>кризис</Text>
            <Text style={S.p}>{a.text.slice(0, 160)}</Text>
            <TouchableOpacity style={S.btn} onPress={() => openCard(a)}>
              <Text style={S.btnText}>Открыть</Text>
            </TouchableOpacity>
          </View>
        ))}
        {rest.map((a) => (
          <View key={a.id} style={S.card}>
            <Text style={S.p}>{a.text.slice(0, 160)}</Text>
            <TouchableOpacity style={[S.btn, S.ghost]} onPress={() => openCard(a)}>
              <Text style={S.ghostText}>Открыть</Text>
            </TouchableOpacity>
          </View>
        ))}
        {!rows.length && <Text style={S.small}>Очередь пуста — всё разобрано.</Text>}
      </View>
      {open && (
        <View style={S.card}>
          <Text style={S.h2}>Обращение #{open.id}</Text>
          <Text style={S.p}>{open.text}</Text>
          <Answers a={open.answers} />
          {!!open.files?.length && <Text style={S.small}>Вложений: {open.files.length}</Text>}
          <Text style={S.small}>Подсказка системы: группа «{suggest.group || "—"}»</Text>
          {suggest.free.map((f) => (
            <TouchableOpacity key={f.id} style={[S.btn, S.ghost]} onPress={() => assign(f.id)}>
              <Text style={S.ghostText}>Назначить {f.login} (нагрузка {f.load})</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[S.btn, S.warn]} onPress={reject}>
            <Text style={S.warnText}>Отклонить как спам</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.btn, S.ghost]} onPress={() => setOpen(null)}>
            <Text style={S.ghostText}>Назад</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

type Card = {
  id: number; text: string; status: string;
  answers: Record<string, string>; files: string[];
  messages: { author: string; text: string }[];
  notes: { text: string }[];
};

export function Expert() {
  const [rows, setRows] = useState<{ id: number; status: string; priority: string; text: string }[]>([]);
  const [card, setCard] = useState<Card | null>(null);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  function load() { staffGet("/api/expert/mine").then(setRows).catch(() => {}); }
  useEffect(load, []);
  async function open(id: number) {
    setCard(await staffGet(`/api/expert/appeals/${id}`));
  }
  async function send(question: boolean) {
    if (!card || !draft.trim()) return;
    await apiPost(`/api/expert/appeals/${card.id}/message`, { text: draft, question });
    setDraft(""); open(card.id);
  }
  async function saveNote() {
    if (!card || !note.trim()) return;
    await apiPost(`/api/expert/appeals/${card.id}/note`, { text: note });
    setNote(""); open(card.id);
  }
  async function ready() {
    if (!card) return;
    await apiPost(`/api/expert/appeals/${card.id}/ready`, { text: "Рекомендации готовы, смотри выше." });
    setCard(null); load();
  }
  async function transfer() {
    if (!card) return;
    const reason = "нужен коллега другого профиля";
    await apiPost(`/api/expert/appeals/${card.id}/transfer`, { reason });
    Alert.alert("Запрошено", "Оператор подтвердит передачу");
  }
  if (!card) {
    return (
      <ScrollView style={S.wrap} contentContainerStyle={S.pad}>
        <View style={S.card}>
          <Text style={S.h2}>Мои обращения</Text>
          {rows.map((a) => (
            <View key={a.id} style={S.card}>
              <Text style={[S.badge, a.priority === "urgent" && S.badgeUrgent]}>{a.priority}</Text>
              <Text style={S.p}>{a.text}</Text>
              <TouchableOpacity style={[S.btn, S.ghost]} onPress={() => open(a.id)}>
                <Text style={S.ghostText}>Открыть</Text>
              </TouchableOpacity>
            </View>
          ))}
          {!rows.length && <Text style={S.small}>Ничего не назначено.</Text>}
        </View>
      </ScrollView>
    );
  }
  return (
    <ScrollView style={S.wrap} contentContainerStyle={S.pad}>
      <View style={S.card}>
      <Text style={S.h2}>Обращение #{card.id}</Text>
      <Text style={S.p}>{card.text}</Text>
      <Answers a={card.answers} />
      {!!card.files?.length && <Text style={S.small}>Вложений: {card.files.length}</Text>}
        {card.messages.map((m, i) => (
          <View key={i} style={[S.msg, m.author === "expert" ? S.msgExpert : S.msgMine]}>
            <Text style={S.p}>{m.text}</Text>
          </View>
        ))}
        <TextInput style={S.input} value={draft} onChangeText={setDraft} placeholder="Ответ заявителю…" />
        <TouchableOpacity style={S.btn} onPress={() => send(false)}>
          <Text style={S.btnText}>Ответить</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[S.btn, S.ghost]} onPress={() => send(true)}>
          <Text style={S.ghostText}>Задать уточняющий вопрос</Text>
        </TouchableOpacity>
        <Text style={S.h2}>Заметки (заявитель не видит)</Text>
        {card.notes.map((n, i) => <Text key={i} style={S.small}>• {n.text}</Text>)}
        <TextInput style={S.input} value={note} onChangeText={setNote} placeholder="Внутренняя заметка…" />
        <TouchableOpacity style={[S.btn, S.ghost]} onPress={saveNote}>
          <Text style={S.ghostText}>Сохранить заметку</Text>
        </TouchableOpacity>
      <TouchableOpacity style={S.btn} onPress={ready}>
        <Text style={S.btnText}>Рекомендации готовы</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[S.btn, S.ghost]} onPress={transfer}>
        <Text style={S.ghostText}>Запросить передачу коллеге</Text>
      </TouchableOpacity>
        <TouchableOpacity style={[S.btn, S.ghost]} onPress={() => { setCard(null); load(); }}>
          <Text style={S.ghostText}>Назад</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export function Admin() {
  const [stats, setStats] = useState<{ total: number; urgent_share: number; returned_share: number } | null>(null);
  const [cat, setCat] = useState("");
  useEffect(() => { staffGet("/api/stats").then(setStats).catch(() => {}); }, []);
  async function addCat() {
    if (!cat.trim()) return;
    await apiPost("/api/admin/categories", { name: cat, group: "general" });
    setCat("");
    Alert.alert("Готово", "Категория добавлена");
  }
  return (
    <ScrollView style={S.wrap} contentContainerStyle={S.pad}>
      <View style={S.card}>
        <Text style={S.h2}>Аналитика</Text>
        {stats && (
          <>
            <Text style={S.p}>Всего обращений: {stats.total}</Text>
            <Text style={S.p}>Доля срочных: {Math.round(stats.urgent_share * 100)}%</Text>
            <Text style={S.p}>Доля возвратов: {Math.round(stats.returned_share * 100)}%</Text>
          </>
        )}
      </View>
      <View style={S.card}>
        <Text style={S.h2}>Новая категория</Text>
        <TextInput style={S.input} value={cat} onChangeText={setCat} placeholder="Название" />
        <TouchableOpacity style={S.btn} onPress={addCat}>
          <Text style={S.btnText}>Добавить</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
