using System;
using System.Collections.Generic;

[Serializable]
public class StateRoot
{
 public int version;
 public string updatedAt;
 public List<TaskItem> tasks;
 public WorldState world;
}

[Serializable]
public class WorldState
{
 public Toggles toggles;
}

[Serializable]
public class Toggles
{
 public bool lamp_main = true;
}

[Serializable]
public class TaskItem
{
 public string id;
 public string title;
 public string status;
 public int priority;
 public string createdAt;
 public string source;
 public string assignedTo;
 public float progress;
}
