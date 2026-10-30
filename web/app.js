import {
  CAPABILITIES, emptyState, validateState, transition,
  importedMetadata, exportedMetadata
} from "../src/state.mjs";

const STORE = "tra.sandbox-manager.config.v1";
const $ = (id) => document.getElementById(id);
const names = {
  "network":"网络访问", "file-read":"文件读取", "file-write":"文件写入",
  "shell":"Shell / 命令执行", "clipboard":"剪贴板",
  "camera":"相机", "microphone":"麦克风", "location":"位置",
  "diagnostic-upload":"诊断信息上传"
};
const modes = {browser:"浏览器",node:"Node",mixed:"组合配置"};
let state = emptyState();
let selected = null;
const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
};
function button(text, callback, className) {
  const node = element("button", className || "", text);
  node.type = "button";
  node.addEventListener("click", callback);
  return node;
}
function message(text, error = false) {
  const node = $("message");
  node.textContent = text;
  node.className = error ? "error" : "";
}
function commit(command, note) {
  try {
    const next = transition(state, command);
    localStorage.setItem(STORE, exportedMetadata(next));
    state = next;
    if (command.type === "create") selected = state.profiles.at(-1)?.id ?? null;
    if (command.type === "delete") selected = state.profiles[0]?.id ?? null;
    render();
    message(note || "已更新本地配置；未修改 Android 的实际隔离或权限。");
  } catch (e) { message("操作未完成：" + e.message, true); }
}
function load() {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw !== null) {
      if (raw.length > 150000) throw new Error("LOCAL_DATA_TOO_LARGE");
      state = validateState(JSON.parse(raw));
    }
  } catch (e) {
    state = emptyState();
    message("已有配置未加载：" + e.message + "。未自动清除原数据。", true);
  }
  selected = state.profiles[0]?.id || null;
}
function renderProfiles() {
  const mount = $("profiles");
  mount.replaceChildren();
  if (!state.profiles.length) {
    mount.append(element("p","empty","还没有环境。创建一个仅用于记录配置的环境。"));
    return;
  }
  for (const profile of state.profiles) {
    const current = profile.id === selected;
    const card = button("",()=>{selected=profile.id;render();},"profile-card" + (current?" active":""));
    card.setAttribute("aria-pressed", String(current));
    const symbol = element("span","profile-icon",profile.mode==="node"?"⌘":profile.mode==="mixed"?"▤":"◎");
    const content = element("span");
    content.append(element("div","profile-name",profile.name));
    content.append(element("div","profile-meta",modes[profile.mode] + " · " +
      (profile.desiredEnabled ? "配置标记为启用" : "配置未启用")));
    card.append(symbol,content,element("span","profile-arrow","›"));
    mount.append(card);
  }
}
function renderDetails() {
  const root = $("details");
  root.replaceChildren();
  const profile = state.profiles.find((item)=>item.id===selected);
  $("detail-title").textContent = profile?.name ?? "环境详情";
  if (!profile) {
    root.append(element("p","empty","选择一个环境后，可管理配置申请和元数据快照。"));
    return;
  }
  root.append(element("p","small-caption",
    "当前仅管理配置。即使标记为启用，也不会启动 Android 沙箱、授予权限或改变系统环境。"));
  const modeRow = element("div","permission-row");
  modeRow.append(element("span","", "配置类型"));
  const modeSelect = element("select");
  modeSelect.setAttribute("aria-label","配置类型");
  for(const [value,label] of Object.entries(modes)){
    const option=element("option","",label);
    option.value=value;modeSelect.append(option);
  }
  modeSelect.value=profile.mode;
  modeSelect.addEventListener("change",()=>commit({type:"mode",profileId:profile.id,mode:modeSelect.value}));
  modeRow.append(modeSelect);root.append(modeRow);
  const controls = element("div","detail-controls");
  controls.append(
    button("✎ 重命名",()=>{
      const next = window.prompt("环境名称（最多 48 字符）",profile.name);
      if (next !== null) commit({type:"rename",profileId:profile.id,name:next});
    }),
    button(profile.desiredEnabled ? "◼ 标记停用":"▷ 标记启用",()=>{
      commit({type:"enable",profileId:profile.id,enabled:!profile.desiredEnabled});
    }),
    button("＋ 配置快照",()=>commit({type:"snapshot",profileId:profile.id},
      "已保存配置快照（不包含文件、Cookie 或运行状态）。")),
    button("全部拒绝",()=>commit({type:"reset-permissions",profileId:profile.id},
      "权限申请偏好已全部恢复为拒绝。Android 系统权限未改变。")),
    button("删除配置",()=>{
      if (window.confirm("删除此环境配置和关联快照？该操作不会清除真实设备数据。"))
        commit({type:"delete",profileId:profile.id},"已删除本地环境配置。");
    },"danger")
  );
  root.append(controls,element("hr","divider"));
  root.append(element("div","section-caption","权限申请偏好（默认拒绝）"));
  root.append(element("p","small-caption","“需要确认”仅是申请偏好，不代表已获权限。真实授权必须由受信任的 Android 原生界面批准。"));
  for (const capability of CAPABILITIES) {
    const row = element("div","permission-row");
    row.append(element("span","",names[capability]));
    const chooser = element("select");
    chooser.setAttribute("aria-label",names[capability] + "的权限申请偏好");
    for (const [value,label] of [["deny","拒绝"],["ask","需要确认"]]) {
      const opt = element("option","",label);
      opt.value=value;
      chooser.append(opt);
    }
    chooser.value = profile.requested[capability];
    chooser.addEventListener("change",()=>{
      commit({type:"permission",profileId:profile.id,capability,value:chooser.value});
    });
    row.append(chooser);
    root.append(row);
  }
  root.append(element("hr","divider"),element("div","section-caption","配置快照"));
  const snapshots = state.snapshots.filter((item)=>item.profileId===profile.id).slice().reverse();
  if (!snapshots.length) root.append(element("p","small-caption","此环境还没有配置快照。"));
  for (const snapshot of snapshots) {
    const row=element("div","snapshot-item");
    row.append(element("span","",new Date(snapshot.createdAt).toLocaleString("zh-CN") + " · 仅元数据"));
    row.append(button("恢复配置",()=>{
      if (window.confirm("将配置恢复到这个版本？会关闭其“标记启用”状态；不会回滚真实文件、浏览器数据或系统。")) {
        commit({type:"restore",profileId:profile.id,snapshotId:snapshot.id},
          "已恢复配置元数据，环境配置已标记停用。");
      }
    }));
    row.append(button("删除快照",()=>{
      if(window.confirm("仅删除这条配置快照？"))
        commit({type:"delete-snapshot",profileId:profile.id,snapshotId:snapshot.id},"已删除配置快照。");
    },"danger"));
    root.append(row);
  }
}
function render() {
  $("profile-count").textContent = String(state.profiles.length);
  $("snapshot-count").textContent = String(state.snapshots.length);
  $("request-count").textContent = String(state.profiles.reduce((sum,p)=>
    sum + Object.values(p.requested).filter(v=>v==="ask").length,0));
  $("limit-label").textContent = "最多 12 个";
  renderProfiles(); renderDetails();
}
$("create-form").addEventListener("submit",(event)=>{
  event.preventDefault();
  commit({type:"create",name:$("new-name").value,mode:$("new-mode").value});
  $("new-name").value="";
});
$("export-btn").addEventListener("click",()=>{
  try {
    const url=URL.createObjectURL(new Blob([exportedMetadata(state)],{type:"application/json"}));
    const a=document.createElement("a"); a.href=url; a.download="tra-config-metadata.json";
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1500);
    message("已导出配置元数据，不包含设备数据或凭据。");
  } catch(e) {message("导出失败："+e.message,true);}
});
$("import-file").addEventListener("change",async(event)=>{
  const file=event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 150000) throw new Error("IMPORT_SIZE_LIMIT");
    const next=importedMetadata(await file.text());
    if (!window.confirm("用导入的配置替换当前所有配置？这不会恢复真实沙箱文件。")) return;
    localStorage.setItem(STORE,exportedMetadata(next));
    state=next;selected=state.profiles[0]?.id || null;
    render();message("配置已导入；所有环境已标记停用，未创建实际授权。");
  } catch(e) {message("导入失败："+e.message,true);}
  finally {event.target.value="";}
});
load();render();
