// src/Graph.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery, useLazyQuery, gql } from '@apollo/client';
import { DataSet, Network } from 'vis-network/standalone';
import { Table, TableBody, TableCell, TableHead, TableRow, Paper } from '@material-ui/core';

const GET_GRAPH_DATA = gql`
  query GetGraphData {
    customers(where: { ecn: "12345" }) {
      title
      hasSessionSessions {
        session_id
        title
        status
        timestamp
      }
    }
  }
`;

const GET_SESSION_COMPONENTS = gql`
query GetSessionComponents($where: SessionWhere) {
    sessions(where: $where) {
      hasComponentComponents {
        session_id
        title
        device
        deviceType
        error_category
        error_reason
        event_status
        interdiction_result
        pre_auth_identifier
        pre_auth_status
        event_name
        sendsRequestToComponent2S {
          title
          session_id
          sendsResponseToComponents {
            title
            session_id
          }
        }
        sendsRequestToComponent3S {
          session_id
          title
          sendsResponseToComponents {
            title
            session_id
          }
        }
        sendsRequestToaps {
          session_id
          title
          sendsResponseToComponents {
            title
            session_id
          }
        }
        sendsRequestToComponent2SConnection {
          edges {
            api_name
            msg
            source_component
            target_component
          }
        }
        component2SSendsResponseToConnection {
          edges {
            api_name
            msg
            source_component
            target_component
          }
        }
        sendsRequestToComponent3SConnection {
          edges {
            api_name
            msg
            source_component
            target_component
          }
        }
        component3SSendsResponseToConnection {
          edges {
            api_name
            msg
            source_component
            target_component
          }
        }
        sendsRequestToapsConnection {
          edges {
            api_name
            msg
            source_component
            target_component
          }
        }
        apssendsResponseToConnection {
          edges {
            api_name
            msg
            source_component
            target_component
          }
        }
      }
      hasComponentComponent2S {
        title
        session_id
      }
      hasComponentComponent3S {
        title
        session_id
        recommended_action
      }
      hasComponentaps {
        title
        session_id
      }
    }
  }  
`;

const GET_COMPONENT3S = gql`
query Component3s($where: Component3Where) {
    component3s(where: $where) {
      title
      session_id
      recommended_action
      hasSubcomponentAuthCs {
        title
        session_id
        sendsRequestTosdis {
          title
          session_id
          sendsResponseToAuthCs {
            title
            session_id
          }
        }
        sendsRequestTosccs {
          title
          session_id
          sendsResponseToAuthCs {
            title
            session_id
          }
        }
        sendsRequestTosps {
          title
          session_id
          sendsResponseToAuthCs {
            title
            session_id
          }
        }
      }
      hasSubcomponentsps {
        title
        risk_rule_list
        recommended_action
        control_point
        session_id
      }
      hasSubcomponentsccs {
        title
        session_id
        ceea_preference
        password_status
      }
      hasSubcomponentsdis {
        title
        session_id
        device_tag
        device_linked_method
        device_linked
        device_id_status
        device_id
        device_bound_method
        device_bound
      }
    }
  }
`;

function formatGraphData(data) {
    if (!data) return { nodes: [], edges: [] };
  
    const customer = data.customers[0];
    const sessions = customer.hasSessionSessions;
  
    // Create nodes for the customer and sessions
    const nodes = [
      { id: 'customer', label: customer.title },
      ...sessions.map(session => ({
        id: session.session_id,
        label: session.title,
        color: session.status === 'Failed' ? 'red' : 'lightblue',
      }))
    ];
  
    // Create edges between the customer and sessions
    const edges = sessions.map(session => ({
      from: 'customer',
      to: session.session_id,
      label: 'HAS_SESSION',
      arrows: 'to',
    }));
  
    return { nodes, edges };
  }

let nodesArray = [];
let edgesArray = [];

const addNode = (id, label, sessionId, recommendedAction = null) => {
    console.log(`addNode called with id: ${id}, label: ${label}, recommendedAction: ${recommendedAction}`);
    
    const existingNode = nodesArray.find(node => node.id === id);

    const color = recommendedAction === 'BLOCK' ? 'RED' : 'lightblue';

    if (!existingNode) {
        const newNode = { id, label, color };

        if (recommendedAction) {
            console.log("recommendedAction added");
            newNode.sessionId = sessionId;
            newNode.recommendedAction = recommendedAction;
        }

        console.log(newNode);
        nodesArray.push(newNode);
    } else {
        console.log(`Node with ID ${id} already exists`);

        // Update the recommendedAction and color for the existing node
        if (recommendedAction) {
            console.log("recommendedAction updated");
            existingNode.sessionId = sessionId;
            existingNode.recommendedAction = recommendedAction;
            existingNode.color = color;
        }
    }
};

const processComponents = (componentList) => {
    componentList.forEach(component => {
        const sourceId = `Component_${component.session_id}`;
        addNode(sourceId, component.title, component.session_id);

        // Helper function to process connections
        const processConnection = (connection, sourceId, targetId, relationshipType) => {
            connection?.edges?.forEach(edge => {
                edgesArray.push({
                    from: sourceId,
                    to: targetId,
                    label: relationshipType,
                    arrows: 'to',
                    api_name: edge.api_name,
                    msg: edge.msg
                });
            });
        };

        // Process sendsRequestToComponent2S relationships
        component.sendsRequestToComponent2S?.forEach(targetComponent => {
            const targetId = `Component2_${targetComponent.session_id}`;
            addNode(targetId, targetComponent.title, targetComponent.session_id);
            processConnection(component.sendsRequestToComponent2SConnection, sourceId, targetId, "SENDS_REQUEST_TO");
            targetComponent.sendsResponseToComponents?.forEach(responseComponent => {
                processConnection(component.component2SSendsResponseToConnection, targetId, sourceId, "SENDS_RESPONSE_TO");
            });
        });

        // Process sendsRequestToComponent3S relationships
        component.sendsRequestToComponent3S?.forEach(targetComponent => {
            const targetId = `Component3_${targetComponent.session_id}`;
            addNode(targetId, targetComponent.title, targetComponent.session_id);
            processConnection(component.sendsRequestToComponent3SConnection, sourceId, targetId, "SENDS_REQUEST_TO");
            targetComponent.sendsResponseToComponents?.forEach(responseComponent => {
                processConnection(component.component3SSendsResponseToConnection, targetId, sourceId, "SENDS_RESPONSE_TO");
            });
        });

        // Process sendsRequestToaps relationships
        component.sendsRequestToaps?.forEach(targetComponent => {
            const targetId = `APS_${targetComponent.session_id}`;
            addNode(targetId, targetComponent.title, targetComponent.session_id);
            processConnection(component.sendsRequestToapsConnection, sourceId, targetId, "SENDS_REQUEST_TO");
            targetComponent.sendsResponseToComponents?.forEach(responseComponent => {
                processConnection(component.apssendsResponseToConnection, targetId, sourceId, "SENDS_RESPONSE_TO");
            });
        });
    }); 
};

  const formatComponentsData = (data) => {
    console.log("data:", data)
    if (!data || !data.sessions) return;

    // Process main components
    processComponents(data.sessions[0].hasComponentComponents);

    // Process Component2S
    data.sessions[0].hasComponentComponent2S.forEach(component => {
        addNode(`Component2_${component.session_id}`, component.title, component.session_id);
    });

    // Process Component3S
    data.sessions[0].hasComponentComponent3S.forEach(component => {
        console.log(component.recommended_action)
        addNode(`Component3_${component.session_id}`, `${component.title}`, component.session_id, component.recommended_action);
    });

    // Process APS
    data.sessions[0].hasComponentaps.forEach(component => {
        addNode(`APS_${component.session_id}`, component.title, component.session_id);
    });

    return {
        nodes: nodesArray,
        edges: edgesArray
    };
};

const formatComponent3SData = (data) => {
    console.log("data:", data)
    if (!data) return;

    let nodesArray = [];
    let edgesArray = [];

    data.component3s.forEach(component => {

        // Process SubcomponentAuthCs
        component.hasSubcomponentAuthCs.forEach(authC => {
            nodesArray.push({
                id: `AuthC_${authC.session_id}`,
                label: authC.title,
                sessionId: authC.session_id,
            });

            // Process sendsRequestTosdis
            authC.sendsRequestTosdis.forEach(sdi => {
                nodesArray.push({
                    id: `Sdi_${sdi.session_id}`,
                    label: sdi.title,
                    sessionId: sdi.session_id,
                });

                edgesArray.push({
                    from: `AuthC_${authC.session_id}`,
                    to: `Sdi_${sdi.session_id}`,
                    label: "SENDS_REQUEST_TO",
                    arrows: 'to',
                    api_name: "getDeviceDetails",
                    msg: "Request"
                });

                // Process sendsResponseToAuthCs for dis
                sdi.sendsResponseToAuthCs.forEach(response => {
                    edgesArray.push({
                        from: `Sdi_${sdi.session_id}`,
                        to: `AuthC_${response.session_id}`,
                        label: "SENDS_RESPONSE_TO",
                        arrows: 'to',
                        api_name: "getDeviceDetails",
                        msg: "Response"
                    });
                });
            });

            // Process sendsRequestTosps
            authC.sendsRequestTosps.forEach(sps => {
                nodesArray.push({
                    id: `Sps_${sps.session_id}`,
                    label: sps.title,
                    sessionId: sps.session_id,
                });

                edgesArray.push({
                    from: `AuthC_${authC.session_id}`,
                    to: `Sps_${sps.session_id}`,
                    label: "SENDS_REQUEST_TO",
                    arrows: 'to',
                    api_name: "getPolicyDetails",
                    msg: "Request"
                });

                // Process sendsResponseToAuthCs for dis
                sps.sendsResponseToAuthCs.forEach(response => {
                    edgesArray.push({
                        from: `Sps_${sps.session_id}`,
                        to: `AuthC_${response.session_id}`,
                        label: "SENDS_RESPONSE_TO",
                        arrows: 'to',
                        api_name: "getPolicyDetails",
                        msg: "Response"
                    });
                });
            });

            // Process sendsRequestTosccs
            authC.sendsRequestTosccs.forEach(scc => {
                nodesArray.push({
                    id: `Scs_${scc.session_id}`,
                    label: scc.title,
                    sessionId: scc.session_id,
                });

                edgesArray.push({
                    from: `AuthC_${authC.session_id}`,
                    to: `Scs_${scc.session_id}`,
                    label: "SENDS_REQUEST_TO",
                    arrows: 'to',
                    api_name: "getCredentialCompliance",
                    msg: "Request"
                });

                // Process sendsResponseToAuthCs for dis
                scc.sendsResponseToAuthCs.forEach(response => {
                    edgesArray.push({
                        from: `Scs_${scc.session_id}`,
                        to: `AuthC_${response.session_id}`,
                        label: "SENDS_RESPONSE_TO",
                        arrows: 'to',
                        api_name: "getCredentialCompliance",
                        msg: "Response"
                    });
                });
            });
        });

        // Function to find and update or add a node
        function updateOrAddNode(nodesArray, node) {
            const existingNodeIndex = nodesArray.findIndex(n => n.id === node.id);
            if (existingNodeIndex !== -1) {
                nodesArray[existingNodeIndex] = { ...nodesArray[existingNodeIndex], ...node };
            } else {
                console.log("Node updated :", node)
                nodesArray.push(node);
            }
        }

        // Process Subcomponentsps
        component.hasSubcomponentsps.forEach(sps => {
            updateOrAddNode(nodesArray, {
                id: `Sps_${sps.session_id}`,
                label: sps.title,
                sessionId: sps.session_id,
                color: sps.recommended_action === 'BLOCK' ? 'RED' : 'lightblue',
                ...sps
            });
        });

        // Process Subcomponentsccs
        component.hasSubcomponentsccs.forEach(scs => {
            updateOrAddNode(nodesArray, {
                id: `Scs_${scs.session_id}`,
                label: scs.title,
                sessionId: scs.session_id,
                ...scs
            });
        });

        // Process Subcomponentsdis
        component.hasSubcomponentsdis.forEach(sdi => {
            updateOrAddNode(nodesArray, {
                id: `Sdi_${sdi.session_id}`,
                label: sdi.title,
                sessionId: sdi.session_id,
                ...sdi
            });
        });
    });

    return {
        nodes: nodesArray,
        edges: edgesArray
    };
}

function Graph() {
  const { loading, error, data } = useQuery(GET_GRAPH_DATA);
  const [getSessionComponents, { data: componentsData }] = useLazyQuery(GET_SESSION_COMPONENTS);
  const [getComponent3S, { data: component3SData }] = useLazyQuery(GET_COMPONENT3S);
  const networkContainer = useRef(null);
  const [network, setNetwork] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [customer, setCustomer] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
//   const [filteredData, setFilteredData] = useState([]); 
  const [setFilteredData] = useState('');
  const triggerSessionComponentsQuery = useCallback((sessionId) => {
    console.log(sessionId); 
    getSessionComponents({ variables: {
        "where": {
          "session_id": "def456"
        }
      } });
  }, [getSessionComponents]);

  const triggerComponent3SQuery = useCallback((sessionId) => {
    console.log(sessionId); 
    getComponent3S({ variables: {
        "where": {
          "session_id": "def456"
        }
      } });
  }, [getComponent3S]);

  const handleSearch = (e) => {
    e.preventDefault();

    let result = data.customers;

    // Filter by customer title if input is provided
    if (customer) {
        result = result.filter(customer => customer.title.includes(customer));
    }

    // If date-time filters are provided, filter sessions for each customer
    if (startDateTime || endDateTime) {
        result = result.map(customer => {
            let filteredSessions = customer.hasSessionSessions;

            if (startDateTime) {
                filteredSessions = filteredSessions.filter(session => new Date(session.timestamp) >= new Date(startDateTime));
            }

            if (endDateTime) {
                filteredSessions = filteredSessions.filter(session => new Date(session.timestamp) <= new Date(endDateTime));
            }

            return {
                ...customer,
                hasSessionSessions: filteredSessions
            };
        }).filter(customer => customer.hasSessionSessions.length > 0); // Only include customers with sessions in the filtered result
    }

    setFilteredData({ customers: result });
}

  useEffect(() => {
    if (data && networkContainer.current) {
      //formatGraphData is a function to format data into nodes and edges
      const { nodes, edges } = formatGraphData(data); 
      const sessions = data.customers[0].hasSessionSessions;
      const networkData = {
        nodes: new DataSet(nodes),
        edges: new DataSet(edges)
      };
      const options = {
        nodes: {
            shape: 'dot',
            size: 30,
            font: {
                size: 12,
                color: '#000000'
            },
            borderWidth: 2
        },
        edges: {
            width: 2,
            font: {
                size: 14,  // Increase font size for better visibility
                background: 'white'  // Add background to the label for better contrast
            },
            arrows: {
                to: {
                    enabled: true,
                    scaleFactor: 0.5
                }
            },
            smooth: {
                type: 'curvedCW',  // Change to curved edges
                roundness: 0.2  // Adjust the curve roundness
            }
        },
        physics: {
            solver: 'repulsion',
            repulsion: {
                nodeDistance: 250,  // Increase distance for better spacing
                centralGravity: 0.05,
                springLength: 200,  // Increase spring length
                springConstant: 0.05
            },
            maxVelocity: 50,
            minVelocity: 0.1,
            timestep: 0.5,
            stabilization: {
                enabled: true,
                iterations: 1000,
                updateInterval: 25
            }
        },
        layout: {
            hierarchical: {
                enabled: false
            }
        },
        interaction: {
            hover: true,
            tooltipDelay: 200,
            hideEdgesOnDrag: true,
            multiselect: false
        }
    };
    
      const network = new Network(networkContainer.current, networkData, options);
      setNetwork(network);

      // Event listener for node clicks
      network.on('click', function (params) {
        if (params.nodes.length > 0) {
          const clickedNodeId = params.nodes[0];
          const clickedNode = sessions.find(session => session.session_id === clickedNodeId);
          setSelectedNode(clickedNode);
          setSelectedEdge(null);
        }
      });

      // Event listener for node double clicks
      network.on('doubleClick', function (params) {
        console.log('double click');
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0];
          console.log(nodeId);
        triggerSessionComponentsQuery(nodeId);
        }
      });
    }
  }, [data, networkContainer, triggerSessionComponentsQuery]);

  useEffect(() => {
    console.log(componentsData);
    if (componentsData && network) {
        const { nodes, edges } = formatComponentsData(componentsData);
        network.setData({ nodes: new DataSet(nodes), edges: new DataSet(edges) });

        // Event listener for click
        network.on("click", function(properties) {
            // Respond to node click
            if (properties.nodes.length > 0) {
                const nodeId = properties.nodes[0];
                const clickedNode = nodesArray.find(node => node.id === nodeId);
                if (clickedNode) {
                    console.log(clickedNode);
                    setSelectedNode(clickedNode);
                    setSelectedEdge(null);
                }
            }

            // Respond to edge (relationship) click
            else if (properties.edges.length > 0) {
                const edgeId = properties.edges[0];
                const edge = edgesArray.find(edge => edge.id === edgeId);
                if (edge) {
                    setSelectedEdge(edge);
                    setSelectedNode(null);
                }
            }
        });

        // Event listener for node double clicks
        network.on('doubleClick', function (params) {
            console.log('double click');
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                console.log("nodeId:",nodeId);
                const clickedNode = nodesArray.find(node => node.id === nodeId);
                if (clickedNode) {
                    sessionId = clickedNode.sessionId;
                    triggerComponent3SQuery(sessionId);
                }
            }
        });
    }
    setNetwork(network);
}, [componentsData, network, triggerComponent3SQuery]);

useEffect(() => {
    console.log(component3SData);
    if (component3SData && network) {
        const { nodes, edges } = formatComponent3SData(component3SData);
        network.setData({ nodes: new DataSet(nodes), edges: new DataSet(edges) });

        // Event listener for relationship click
        network.on("click", function(properties) {
            console.log("Single click")
            console.log(properties)
            // Respond to node click
            if (properties.nodes.length > 0) {
                const nodeId = properties.nodes[0];
                const clickedNode = nodes.find(node => node.id === nodeId);
                if (clickedNode) {
                    console.log(clickedNode);
                    setSelectedNode(clickedNode);
                    setSelectedEdge(null);
                }
            }

            // Respond to edge (relationship) click
            else if (properties.edges.length > 0) {
                const edgeId = properties.edges[0];
                const edge = edges.find(edge => edge.id === edgeId);
                if (edge) {
                    setSelectedEdge(edge);
                    setSelectedNode(null);
                }
            }
        });
    }
    setNetwork(network);
}, [component3SData, network]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :(</p>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{
                fontWeight: 'bold',
                marginBottom: '20px',
                paddingTop: '20px',  // Doubled padding
                paddingBottom: '20px',  // Doubled padding
                backgroundColor: '#4CAF50', // Existing color
                color: 'white',  // Existing text color
                borderRadius: '5px',
                width: '100%',
                textAlign: 'center'  // Center align the text
            }}>
                Knowledge Graph
            </h1>
            <div style={{ marginBottom: '20px', padding: '10px' }}>
                <form onSubmit={handleSearch}>
                <input 
                    type="text" 
                    placeholder="Customer" 
                    value={customer} 
                    onChange={(e) => setCustomer(e.target.value)}
                />
                <input 
                    type="datetime-local" 
                    value={startDateTime} 
                    onChange={(e) => setStartDateTime(e.target.value)}
                />
                <input 
                    type="datetime-local" 
                    value={endDateTime} 
                    onChange={(e) => setEndDateTime(e.target.value)}
                />
                <button type="submit">Search</button>
                </form>
            </div>
            <div style={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
                <div ref={networkContainer} style={{ width: '60%', height: '800px' }}></div>
                {selectedNode && (
                    <Paper style={{ marginLeft: '20px', width: '40%', overflowX: 'auto' }}>
                        <Table>
                            <TableHead style={{ backgroundColor: '#D3D3D3' }}> {/* This will give a green color fill */}
                                <TableRow>
                                    <TableCell>Property</TableCell>
                                    <TableCell>Value</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {selectedNode.title && (
                                    <TableRow>
                                        <TableCell>Title</TableCell>
                                        <TableCell>{selectedNode.title}</TableCell>
                                    </TableRow>
                                )}
                                {selectedNode.status && (
                                    <TableRow>
                                        <TableCell>Status</TableCell>
                                        <TableCell>{selectedNode.status}</TableCell>
                                    </TableRow>
                                )}
                                {selectedNode.timestamp && (
                                    <TableRow>
                                        <TableCell>Timestamp</TableCell>
                                        <TableCell>{selectedNode.timestamp}</TableCell>
                                    </TableRow>
                                )}
                                {selectedNode.sessionId && (
                                    <TableRow>
                                        <TableCell>Session Id</TableCell>
                                        <TableCell>{selectedNode.sessionId}</TableCell>
                                    </TableRow>
                                )}
                                {selectedNode.recommendedAction && (
                                    <TableRow>
                                        <TableCell>Recommended Action</TableCell>
                                        <TableCell>{selectedNode.recommendedAction}</TableCell>
                                    </TableRow>
                                )}
                                {selectedNode.recommended_action && (
                                    <TableRow>
                                        <TableCell>Recommended Action</TableCell>
                                        <TableCell>{selectedNode.recommended_action}</TableCell>
                                    </TableRow>
                                )}
                                {selectedNode.risk_rule_list && (
                                    <TableRow>
                                        <TableCell>Risk Rule List</TableCell>
                                        <TableCell>{selectedNode.risk_rule_list.join(", ")}</TableCell>
                                    </TableRow>
                                )}
                                {selectedNode.control_point && (
                                    <TableRow>
                                        <TableCell>Control Point</TableCell>
                                        <TableCell>{selectedNode.control_point}</TableCell>
                                    </TableRow>
                                )}
                                {selectedNode.ceea_preference && (
                                    <TableRow>
                                        <TableCell>CEEA Preference</TableCell>
                                        <TableCell>{selectedNode.ceea_preference}</TableCell>
                                    </TableRow>
                                )}
                                {selectedNode.password_status && (
                                    <TableRow>
                                        <TableCell>Password Status</TableCell>
                                        <TableCell>{selectedNode.password_status}</TableCell>
                                    </TableRow>
                                )}
                                {selectedNode.device_tag && (
                                    <TableRow>
                                        <TableCell>Device Tag</TableCell>
                                        <TableCell>{selectedNode.device_tag}</TableCell>
                                    </TableRow>
                                )}
                                {selectedNode.device_linked_method && (
                                    <TableRow>
                                        <TableCell>Device Linked Method</TableCell>
                                        <TableCell>{selectedNode.device_linked_method}</TableCell>
                                    </TableRow>
                                )}
                                {typeof selectedNode.device_linked !== 'undefined' && (
                                    <TableRow>
                                        <TableCell>Device Linked</TableCell>
                                        <TableCell>{selectedNode.device_linked ? 'Yes' : 'No'}</TableCell>
                                    </TableRow>
                                )}
                                {selectedNode.device_id_status && (
                                    <TableRow>
                                        <TableCell>Device ID Status</TableCell>
                                        <TableCell>{selectedNode.device_id_status}</TableCell>
                                    </TableRow>
                                )}
                                {selectedNode.device_id && (
                                    <TableRow>
                                        <TableCell>Device ID</TableCell>
                                        <TableCell>{selectedNode.device_id}</TableCell>
                                    </TableRow>
                                )}
                                {selectedNode.device_bound_method && (
                                    <TableRow>
                                        <TableCell>Device Bound Method</TableCell>
                                        <TableCell>{selectedNode.device_bound_method}</TableCell>
                                    </TableRow>
                                )}
                                {typeof selectedNode.device_bound !== 'undefined' && (
                                    <TableRow>
                                        <TableCell>Device Bound</TableCell>
                                        <TableCell>{selectedNode.device_bound ? 'Yes' : 'No'}</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Paper>
                )}
                {selectedEdge && (
                    <Paper style={{ marginLeft: '20px', width: '40%', overflowX: 'auto' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Property</TableCell>
                                    <TableCell>Value</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {selectedEdge.api_name && (
                                    <TableRow>
                                        <TableCell>API Name</TableCell>
                                        <TableCell>{selectedEdge.api_name}</TableCell>
                                    </TableRow>
                                )}
                                {selectedEdge.msg && (
                                    <TableRow>
                                        <TableCell>Message</TableCell>
                                        <TableCell>{selectedEdge.msg}</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Paper>
                )}
            </div>
        </div>
    );




}

export default Graph;
