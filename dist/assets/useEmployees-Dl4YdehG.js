import{f as o,m as i,n as d,s}from"./index-jl0uuylT.js";import{u}from"./DashboardLayout-CAb8zaWp.js";import{f as l}from"./format-CPCOhgcH.js";function f(a){return o({queryKey:["employees"],queryFn:async()=>{const{data:t,error:r}=await s.from("employees").select(`
          id,
          employee_code,
          first_name,
          last_name,
          email,
          phone,
          designation,
          hire_date,
          status,
          avatar_url,
          department:departments!employees_department_id_fkey(name)
        `).order("created_at",{ascending:!1});if(r)throw r;return(t||[]).map(e=>{var n;return{id:e.id,employeeCode:e.employee_code,name:`${e.first_name} ${e.last_name}`,email:e.email,phone:e.phone,avatar:e.avatar_url||void 0,department:((n=e.department)==null?void 0:n.name)||"Unassigned",designation:e.designation,joinDate:l(new Date(e.hire_date),"MMM d, yyyy"),status:e.status}})},enabled:a==null?void 0:a.enabled})}function _(a){return o({queryKey:["employee-directory"],queryFn:async()=>{const{data:t,error:r}=await s.from("employee_directory").select(`
          id,
          employee_code,
          first_name,
          last_name,
          email,
          phone,
          designation,
          hire_date,
          status,
          avatar_url,
          department_name
        `).order("first_name",{ascending:!0});if(r)throw r;return(t||[]).map(e=>({id:e.id,employeeCode:e.employee_code,name:`${e.first_name} ${e.last_name}`,email:e.email,phone:e.phone,avatar:e.avatar_url||void 0,department:e.department_name||"Unassigned",designation:e.designation,joinDate:l(new Date(e.hire_date),"MMM d, yyyy"),status:e.status}))},enabled:a==null?void 0:a.enabled})}function p(){return o({queryKey:["departments"],queryFn:async()=>{const{data:a,error:t}=await s.from("departments").select("id, name, description").order("name");if(t)throw t;return a||[]}})}function h(){const a=i();return u({mutationFn:async t=>{const r=[];for(const e of t){const{error:n}=await s.from("employees").delete().eq("id",e);n&&r.push(`Failed to delete employee ${e}: ${n.message}`)}if(r.length>0)throw new Error(r.join("; "));return{deletedCount:t.length}},onSuccess:()=>{a.invalidateQueries({queryKey:["employees"]}),a.invalidateQueries({queryKey:["employee-stats"]}),a.invalidateQueries({queryKey:["attendance"]}),a.invalidateQueries({queryKey:["leave-requests"]}),a.invalidateQueries({queryKey:["payroll"]})},onError:t=>{d.error("Failed to delete employees: "+t.message)}})}function g(){const a=i();return u({mutationFn:async({employeeIds:t,status:r})=>{const{error:e}=await s.from("employees").update({status:r}).in("id",t);if(e)throw new Error(`Failed to update employee status: ${e.message}`);return{updatedCount:t.length,status:r}},onSuccess:()=>{a.invalidateQueries({queryKey:["employees"]}),a.invalidateQueries({queryKey:["employee-stats"]})},onError:t=>{d.error("Failed to update employee status: "+t.message)}})}export{_ as a,p as b,h as c,g as d,f as u};
