const demo = {
  dashboard: { metrics: { emergencies: 3, affectedLocations: 6, suppliers: 28, supplyUnits: 48200, availableVehicles: 16, pendingRequests: 45, activeDeliveries: 24, completedDeliveries: 128 }, charts: [] },
  emergencies: [{ id:'DEMO-AL-2048',title:'Monsoon flooding',type:'flood',severity:'critical',status:'active',location:{name:'Kendrapara',district:'Kendrapara',state:'Odisha'},affectedPeople:18400,source:'demo' },{id:'DEMO-AL-2046',title:'Cyclone watch',type:'cyclone',severity:'high',status:'active',location:{name:'Puri coastline',district:'Puri',state:'Odisha'},affectedPeople:9250,source:'demo'}],
  inventory: [{id:'DEMO-INV-1',name:'Drinking water',quantity:8400,unit:'bottles',location:'Cuttack',source:'demo'},{id:'DEMO-INV-2',name:'Food packets',quantity:3200,unit:'packets',location:'Bhubaneswar',source:'demo'}],
  vehicles: [{id:'DEMO-V-1',registration:'DEMO-OD-01-0001',type:'Truck',status:'available',locationSource:'unknown'}],
  requests: [{id:'DEMO-REQ-8031',location:'Kendrapara, Odisha',priority:'critical',status:'pending',items:[{name:'Drinking water',quantity:2400}],source:'demo'}]
};
module.exports = { demo };
