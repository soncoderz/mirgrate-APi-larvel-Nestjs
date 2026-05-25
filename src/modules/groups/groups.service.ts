import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './entities/group.entity';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
  ) {}

  async getGroups() {
    return this.groupRepository.find({ where: { status: 1 } });
  }

  async getGroupById(id: number) {
    return this.groupRepository.findOne({ where: { id } });
  }

  async getGroupBySecret(secret: string) {
    return this.groupRepository.findOne({ where: { secret } });
  }

  async getGroupsWithPage(filters: any, page = 1, perPage = 20) {
    const qb = this.groupRepository.createQueryBuilder('group');
    if (filters.search) {
      qb.andWhere('group.name LIKE :search', { search: `%${filters.search}%` });
    }
    const [items, total] = await qb
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount();
    return { data: items, meta: { page, per_page: perPage, total, last_page: Math.ceil(total / perPage) } };
  }

  async addGroup(data: Partial<Group>) {
    const group = this.groupRepository.create(data);
    return this.groupRepository.save(group);
  }

  async updateGroup(id: number, data: Partial<Group>) {
    await this.groupRepository.update(id, data);
    return this.getGroupById(id);
  }

  async deleteGroup(id: number) {
    await this.groupRepository.update(id, { status: 0 });
    return { message: 'Đã xóa nhóm thành công' };
  }

  async duplicateGroup(id: number) {
    const group = await this.getGroupById(id);
    if (!group) return null;
    const { id: _, ...data } = group;
    const newGroup = this.groupRepository.create({ ...data, name: `${data.name} (copy)` });
    return this.groupRepository.save(newGroup);
  }
}
