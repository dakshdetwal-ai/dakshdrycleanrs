(() => {
  const supabase = window.dakshSupabase;
  const container = document.getElementById("trackingContent");
  const stages = [
    ["pending","Request Received","Your order request has been received."],
    ["confirmed","Order Confirmed","Our team has confirmed your order and pricing."],
    ["pickup scheduled","Pickup Scheduled","Your pickup arrangements have been confirmed."],
    ["processing","Processing","Your garments are being cleaned and cared for."],
    ["ready","Ready","Your garments are ready."],
    ["completed","Completed","Your order has been completed."]
  ];
  const normalise = value => String(value || "").trim().toLowerCase().replace(/[_-]+/g," ");
  const dateText = value => value ? new Date(value).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "Not scheduled";
  function node(tag,className,text) {
    const element=document.createElement(tag);
    if(className) element.className=className;
    if(text!==undefined) element.textContent=text;
    return element;
  }
  function renderOrder(order, customerName) {
    const card=node("article","track-order");
    const top=node("div","track-order-top");
    const left=node("div");
    const id=order.order_number || ("DAK-"+new Date(order.created_at).getFullYear()+"-"+String(order.id || "").replace(/-/g,"").slice(0,6).toUpperCase());
    left.append(node("div","track-reference","ORDER ID · "+id));
    left.append(node("div","track-customer","Customer · "+customerName));
    left.append(node("h3","",order.item_description || "Laundry order"));
    const statusValue=normalise(order.status || "pending");
    const statusLabel=stages.find(stage=>stage[0]===statusValue)?.[1] || (order.status || "Pending");
    top.append(left,node("span","track-status",statusLabel));
    card.append(top);
    const meta=node("div","track-meta");
    meta.append(node("span","", "Submitted: "+dateText(order.created_at)));
    meta.append(node("span","", "Service: "+(order.service || "To be confirmed")));
    meta.append(node("span","", "Quantity: "+(order.quantity || 0)+" pieces"));
    if(order.total_price !== null && order.total_price !== undefined) meta.append(node("span","track-price","Total price: ₹"+Number(order.total_price).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})));
    if(order.expected_completion_date) meta.append(node("span","track-completion","Expected completion: "+dateText(order.expected_completion_date)));
    if(order.pickup_date) meta.append(node("span","", "Pickup: "+dateText(order.pickup_date)));
    card.append(meta);
    const journey=node("div","journey");
    const special=["cancelled","on hold","onhold"];
    if(special.includes(statusValue)) {
      const step=node("div","journey-step current");
      step.append(node("span","journey-marker",statusValue==="cancelled"?"×":"!"));
      const copy=node("div","journey-copy");
      copy.append(node("strong","",statusValue==="cancelled"?"Cancelled":"On Hold"));
      copy.append(node("small","",statusValue==="cancelled"?"This order has been cancelled. Please contact the shop if you need help.":"Your order is temporarily on hold. Our team will update you soon."));
      step.append(copy); journey.append(step);
    } else {
      let active=stages.findIndex(stage=>stage[0]===statusValue);
      if(active<0) active=0;
      stages.forEach((stage,index)=>{
        const step=node("div","journey-step"+(index<active?" done":index===active?" current":""));
        step.append(node("span","journey-marker",index<active?"✓":String(index+1)));
        const copy=node("div","journey-copy");
        copy.append(node("strong","",stage[1]));
        copy.append(node("small","",stage[2]));
        step.append(copy); journey.append(step);
      });
    }
    card.append(journey);
    const details=node("details","order-details");
    details.append(node("summary","","View order details"));
    [["Garments",order.item_description],["Service",order.service],["Pickup address",order.address],["Additional instructions",order.notes]].forEach(([label,value])=>{
      if(!value) return;
      const line=node("p");
      const strong=node("strong","",label+": ");
      line.append(strong,document.createTextNode(String(value))); details.append(line);
    });
    card.append(details);
    return card;
  }
  async function init() {
    const {data:{session},error:sessionError}=await supabase.auth.getSession();
    if(sessionError) throw sessionError;
    if(!session) { window.location.replace("login.html?next=track-order.html"); return; }
    const {data,error}=await supabase.from("orders")
      .select("id,order_number,user_id,item_description,service,quantity,pickup_date,status,created_at,address,notes,total_price,expected_completion_date")
      .eq("user_id",session.user.id).order("created_at",{ascending:false}).limit(50);
    if(error) throw error;
    container.replaceChildren();
    if(!data.length) {
      const empty=node("div","track-empty");
      const art=node("div","track-empty-art","🧺");
      empty.append(art,node("h3","", "No orders yet!"));
      empty.append(node("p","","Once you request a pickup, your order progress and status updates will appear here."));
      const link=node("a","track-button","Place your first order →"); link.href="dashboard.html#newOrder";
      empty.append(link); container.append(empty); return;
    }
    const {data:profile}=await supabase.from("profiles").select("full_name").eq("id",session.user.id).maybeSingle();
    const customerName=profile?.full_name || session.user.email || "Customer";
    data.forEach(order=>container.append(renderOrder(order,customerName)));
  }
  init().catch(error=>{
    console.error("Order tracking error:",error);
    container.replaceChildren(node("p","track-error","We couldn't load your orders right now. Please refresh or return to your dashboard."));
  });
})();